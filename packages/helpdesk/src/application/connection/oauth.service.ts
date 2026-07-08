import { createHash, randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import type { GmailConnection } from '../../domain/connection/gmail-connection'
import { GmailNotConfiguredError } from '../../domain/helpdesk-errors'
import type { ConnectionRepository } from '../../domain/ports/connection-repository.port'
import type { GmailClient } from '../../domain/ports/gmail-client.port'
import type { OAuthProvider } from '../../domain/ports/oauth-provider.port'
import type { OAuthStateRepository } from '../../domain/ports/oauth-state-repository.port'
import type { SecretBox } from '../../domain/ports/secret-box.port'
import type { Actor } from '../actor'

/** Único provedor do help desk: a caixa do Gmail. */
const PROVIDER = 'google'

export interface OAuthCoreConfig {
  secretBox: SecretBox
  /** Origem PÚBLICA do gateway — a redirect_uri é derivada SÓ daqui (anti open-redirect). */
  redirectBaseUrl: string
  /** URL do helpdesk-app (destino dos 302 do callback). */
  appUrl: string
}

export class OAuthService {
  constructor(
    private readonly states: OAuthStateRepository,
    private readonly connections: ConnectionRepository,
    private readonly core: OAuthCoreConfig | null,
    private readonly provider: OAuthProvider | null,
    private readonly gmail: GmailClient,
    private readonly config: { stateTtlMinutes: number },
    private readonly now: () => Date,
    private readonly idGen: () => string,
    private readonly logger: Logger,
  ) {}

  private redirectUri(): string {
    if (!this.core) throw new GmailNotConfiguredError()
    return `${this.core.redirectBaseUrl}/helpdesk/oauth/${PROVIDER}/callback`
  }

  /** Inicia o fluxo: grava state+PKCE single-use e devolve a authorizeUrl. */
  async start(actor: Actor, providerRaw: string): Promise<{ authorizeUrl: string }> {
    if (providerRaw !== PROVIDER || !this.core || !this.provider) {
      throw new GmailNotConfiguredError()
    }
    const at = this.now()
    const state = randomBytes(32).toString('base64url')
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    await this.states.create({
      state,
      provider: PROVIDER,
      codeVerifier,
      createdBy: actor.userId,
      expiresAt: new Date(at.getTime() + this.config.stateTtlMinutes * 60_000),
      usedAt: null,
      createdAt: at,
    })
    return {
      authorizeUrl: this.provider.buildAuthorizeUrl({
        state,
        codeChallenge,
        redirectUri: this.redirectUri(),
      }),
    }
  }

  /**
   * Callback do Google. É navegação de BROWSER: o resultado é SEMPRE uma URL de
   * redirect (`/configuracoes?connected=google` ou `?error=<code>`), nunca JSON.
   */
  async handleCallback(
    providerRaw: string,
    query: { code?: string; state?: string; error?: string },
  ): Promise<string> {
    if (!this.core || !this.provider) throw new GmailNotConfiguredError()
    const appUrl = this.core.appUrl
    const redirect = (params: string) => `${appUrl}/configuracoes?${params}`
    if (providerRaw !== PROVIDER) return redirect('error=provider_not_supported')
    if (query.error) return redirect('error=access_denied')
    if (!query.state || !query.code) return redirect('error=state_invalid')

    // Single-use ATÔMICO: reuso/vencido/corrida → um único vencedor.
    const consumed = await this.states.consume(query.state, this.now())
    if (!consumed || consumed.provider !== PROVIDER || !consumed.codeVerifier) {
      return redirect('error=state_invalid')
    }

    try {
      const tokens = await this.provider.exchangeCode({
        code: query.code,
        codeVerifier: consumed.codeVerifier,
        redirectUri: this.redirectUri(),
      })
      const identity = this.provider.identityFromIdToken(tokens.idToken)
      if (!identity) return redirect('error=identity_missing')
      const profile = await this.gmail.getProfile(tokens.accessToken)
      await this.upsertConnection({
        sub: identity.sub,
        emailAddress: profile.emailAddress,
        historyId: profile.historyId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresInSeconds: tokens.expiresInSeconds,
        scopes: tokens.scopes,
        connectedBy: consumed.createdBy,
      })
    } catch (error) {
      // Nunca logar code/token — só o motivo.
      this.logger.error('oauth.callback.exchange_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return redirect('error=exchange_failed')
    }
    return redirect(`connected=${PROVIDER}`)
  }

  private async upsertConnection(input: {
    sub: string
    emailAddress: string
    historyId: string
    accessToken: string
    refreshToken: string | null
    expiresInSeconds: number | null
    scopes: string[]
    connectedBy: string
  }): Promise<void> {
    if (!this.core) throw new GmailNotConfiguredError()
    const { secretBox } = this.core
    const at = this.now()
    const tokenExpiresAt = input.expiresInSeconds
      ? new Date(at.getTime() + input.expiresInSeconds * 1000)
      : null
    const existing = await this.connections.byExternalId(input.sub)
    if (existing) {
      // Reconexão: retoma do lastHistoryId existente (não re-backfill), tokens novos.
      existing.emailAddress = input.emailAddress
      existing.accessTokenEnc = secretBox.seal(input.accessToken)
      if (input.refreshToken) existing.refreshTokenEnc = secretBox.seal(input.refreshToken)
      existing.tokenExpiresAt = tokenExpiresAt
      existing.scopes = input.scopes
      existing.status = 'connected'
      // Sem lastHistoryId (1ª conexão que nunca sincronizou) → backfill; senão retoma.
      existing.syncNextAt = at
      existing.syncAttempts = 0
      existing.lastSyncError = null
      existing.version += 1
      existing.updatedAt = at
      await this.connections.update(existing)
      this.logger.info('gmail.reconnected', { email: input.emailAddress })
      return
    }
    const connection: GmailConnection = {
      id: this.idGen(),
      version: 0,
      emailAddress: input.emailAddress,
      externalId: input.sub,
      accessTokenEnc: secretBox.seal(input.accessToken),
      refreshTokenEnc: input.refreshToken ? secretBox.seal(input.refreshToken) : null,
      tokenExpiresAt,
      scopes: input.scopes,
      status: 'connected',
      // null = 1º tick faz o backfill (newer_than:…) e semeia o lastHistoryId.
      lastHistoryId: null,
      lastSyncAt: null,
      syncNextAt: at,
      syncAttempts: 0,
      lastSyncError: null,
      connectedBy: input.connectedBy,
      connectedByName: null,
      metadata: {},
      createdAt: at,
      updatedAt: at,
    }
    await this.connections.create(connection)
    this.logger.info('gmail.connected', { email: input.emailAddress })
  }
}
