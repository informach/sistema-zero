import { createHash, randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { NetworkNotSupportedError, OAuthNotConfiguredError } from '../../domain/marketing-errors'
import type { OAuthProvider } from '../../domain/ports/oauth-provider.port'
import type { OAuthStateRepository } from '../../domain/ports/oauth-state-repository.port'
import type { SecretBox } from '../../domain/ports/secret-box.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { Network } from '../../domain/publication/publication'
import type { Actor } from '../actor'
import { buildSocialAccount } from './provider-account'

/**
 * Redes que INICIAM um fluxo OAuth. `instagram` fica de fora DE PROPÓSITO: o
 * consent da Meta começa em `facebook` e conecta a Página E o Instagram
 * business juntos (o provider devolve as duas contas).
 */
const START_NETWORKS: ReadonlySet<string> = new Set(['youtube', 'facebook'])

/** Config comum do OAuth (independe do provedor). */
export interface OAuthCoreConfig {
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
    private readonly core: OAuthCoreConfig | null,
    /** youtube→Google; facebook E instagram→Meta (o mesmo provider). */
    private readonly providers: ReadonlyMap<Network, OAuthProvider>,
    private readonly config: { stateTtlMinutes: number },
    private readonly now: () => Date,
    private readonly idGen: () => string,
    private readonly logger: Logger,
  ) {}

  private redirectUri(network: Network): string {
    if (!this.core) throw new OAuthNotConfiguredError()
    return `${this.core.redirectBaseUrl}/marketing/oauth/${network}/callback`
  }

  /** Inicia o fluxo: grava state+PKCE single-use e devolve a authorizeUrl. */
  async start(actor: Actor, networkRaw: string): Promise<{ authorizeUrl: string }> {
    if (!START_NETWORKS.has(networkRaw)) {
      throw networkRaw === 'instagram'
        ? new NetworkNotSupportedError(
            'O Instagram conecta junto com o Facebook. Use Conectar Facebook',
          )
        : new NetworkNotSupportedError()
    }
    const network = networkRaw as Network
    const provider = this.providers.get(network)
    if (!this.core || !provider) throw new OAuthNotConfiguredError()
    const at = this.now()
    const state = randomBytes(32).toString('base64url')
    // PKCE S256 sempre gerado; provedor que não suporta (Meta) simplesmente
    // ignora — o state single-use atômico já cobre o CSRF.
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
      authorizeUrl: provider.buildAuthorizeUrl({
        state,
        codeChallenge,
        redirectUri: this.redirectUri(network),
      }),
    }
  }

  /**
   * Callback do provedor. É navegação de BROWSER: o resultado é SEMPRE uma URL
   * de redirect (`/conexoes?connected=…` ou `?error=<code>`), nunca JSON.
   * UM consent pode conectar VÁRIAS contas (Meta: Páginas + IGs) — upsert em loop.
   */
  async handleCallback(
    networkRaw: string,
    query: { code?: string; state?: string; error?: string },
  ): Promise<string> {
    if (!this.core) throw new OAuthNotConfiguredError()
    const appUrl = this.core.appUrl
    const redirect = (params: string) => `${appUrl}/conexoes?${params}`
    if (!START_NETWORKS.has(networkRaw)) return redirect('error=network_not_supported')
    const network = networkRaw as Network
    const provider = this.providers.get(network)
    if (!provider) return redirect('error=oauth_not_configured')
    if (query.error) return redirect('error=access_denied')
    if (!query.state || !query.code) return redirect('error=state_invalid')

    // Single-use ATÔMICO: reuso/vencido/corrida → um único vencedor.
    const consumed = await this.states.consume(query.state, this.now())
    if (!consumed || consumed.network !== network || !consumed.codeVerifier) {
      return redirect('error=state_invalid')
    }

    try {
      const tokens = await provider.exchangeCode({
        code: query.code,
        codeVerifier: consumed.codeVerifier,
        redirectUri: this.redirectUri(network),
      })
      const providerAccounts = await provider.resolveAccounts(tokens)
      if (providerAccounts.length === 0) return redirect('error=no_accounts')
      for (const account of providerAccounts) {
        await this.accounts.upsertByExternalId(
          buildSocialAccount({
            account,
            secretBox: this.core.secretBox,
            connectedBy: consumed.createdBy,
            now: this.now(),
            id: this.idGen(),
          }),
        )
      }
    } catch (error) {
      // Nunca logar code/token — só o motivo.
      this.logger.error('oauth.callback.exchange_failed', {
        network,
        error: error instanceof Error ? error.message : String(error),
      })
      return redirect('error=exchange_failed')
    }
    return redirect(`connected=${network}`)
  }
}
