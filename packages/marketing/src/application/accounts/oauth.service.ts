import { createHash, randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { NetworkNotSupportedError, OAuthNotConfiguredError } from '../../domain/marketing-errors'
import type { OAuthProvider } from '../../domain/ports/oauth-provider.port'
import type { OAuthStateRepository } from '../../domain/ports/oauth-state-repository.port'
import type { SecretBox } from '../../domain/ports/secret-box.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { Network } from '../../domain/publication/publication'
import type { SocialAccount } from '../../domain/social-account/social-account'
import type { Actor } from '../actor'

/** Redes com fluxo OAuth implementado (Meta/TikTok entram nas fases F3/F4). */
const SUPPORTED_NETWORKS: ReadonlySet<string> = new Set(['youtube'])

export interface GoogleOAuthDeps {
  provider: OAuthProvider
  secretBox: SecretBox
  /** Origem PÚBLICA do gateway — a redirect_uri é derivada SÓ daqui (anti open-redirect). */
  redirectBaseUrl: string
  /** URL do marketing-app (destino dos 302 do callback). */
  appUrl: string
}

export class OAuthService {
  constructor(
    private readonly states: OAuthStateRepository,
    private readonly accounts: SocialAccountRepository,
    private readonly google: GoogleOAuthDeps | null,
    private readonly config: { stateTtlMinutes: number },
    private readonly now: () => Date,
    private readonly idGen: () => string,
    private readonly logger: Logger,
  ) {}

  private redirectUri(network: Network): string {
    if (!this.google) throw new OAuthNotConfiguredError()
    return `${this.google.redirectBaseUrl}/marketing/oauth/${network}/callback`
  }

  private assertNetwork(network: string): Network {
    if (!SUPPORTED_NETWORKS.has(network)) throw new NetworkNotSupportedError()
    return network as Network
  }

  /** Inicia o fluxo: grava state+PKCE single-use e devolve a authorizeUrl. */
  async start(actor: Actor, networkRaw: string): Promise<{ authorizeUrl: string }> {
    const network = this.assertNetwork(networkRaw)
    if (!this.google) throw new OAuthNotConfiguredError()
    const at = this.now()
    const state = randomBytes(32).toString('base64url')
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    await this.states.create({
      state,
      network,
      codeVerifier,
      createdBy: actor.userId,
      expiresAt: new Date(at.getTime() + this.config.stateTtlMinutes * 60_000),
      usedAt: null,
      createdAt: at,
    })
    return {
      authorizeUrl: this.google.provider.buildAuthorizeUrl({
        state,
        codeChallenge,
        redirectUri: this.redirectUri(network),
      }),
    }
  }

  /**
   * Callback do provedor. É navegação de BROWSER: o resultado é SEMPRE uma URL
   * de redirect (`/conexoes?connected=…` ou `?error=<code>`), nunca JSON.
   */
  async handleCallback(
    networkRaw: string,
    query: { code?: string; state?: string; error?: string },
  ): Promise<string> {
    if (!this.google) throw new OAuthNotConfiguredError()
    const redirect = (params: string) => `${this.google?.appUrl}/conexoes?${params}`
    if (!SUPPORTED_NETWORKS.has(networkRaw)) return redirect('error=network_not_supported')
    const network = networkRaw as Network
    if (query.error) return redirect('error=access_denied')
    if (!query.state || !query.code) return redirect('error=state_invalid')

    // Single-use ATÔMICO: reuso/vencido/corrida → um único vencedor.
    const consumed = await this.states.consume(query.state, this.now())
    if (!consumed || consumed.network !== network || !consumed.codeVerifier) {
      return redirect('error=state_invalid')
    }

    let account: SocialAccount
    try {
      const tokens = await this.google.provider.exchangeCode({
        code: query.code,
        codeVerifier: consumed.codeVerifier,
        redirectUri: this.redirectUri(network),
      })
      const identity = await this.google.provider.fetchIdentity(tokens.accessToken, tokens.idToken)
      const at = this.now()
      account = {
        id: this.idGen(),
        version: 0,
        network,
        externalId: identity.externalId,
        displayName: identity.displayName,
        username: identity.username,
        accessTokenEnc: this.google.secretBox.seal(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken
          ? this.google.secretBox.seal(tokens.refreshToken)
          : null,
        tokenExpiresAt: tokens.expiresInSeconds
          ? new Date(at.getTime() + tokens.expiresInSeconds * 1000)
          : null,
        refreshExpiresAt: tokens.refreshExpiresInSeconds
          ? new Date(at.getTime() + tokens.refreshExpiresInSeconds * 1000)
          : null,
        scopes: tokens.scopes,
        status: 'connected',
        metadata: identity.metadata,
        connectedBy: consumed.createdBy,
        lastRefreshAt: null,
        lastRefreshError: null,
        createdAt: at,
        updatedAt: at,
      }
    } catch (error) {
      // Nunca logar code/token — só o motivo.
      this.logger.error('oauth.callback.exchange_failed', {
        network,
        error: error instanceof Error ? error.message : String(error),
      })
      return redirect('error=exchange_failed')
    }
    await this.accounts.upsertByExternalId(account)
    return redirect(`connected=${network}`)
  }
}
