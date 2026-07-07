import type { Logger } from '@sistemazero/core/logging'
import {
  AccountNotConnectedError,
  AccountNotFoundError,
  ConcurrencyConflictError,
  OAuthNotConfiguredError,
} from '../../domain/marketing-errors'
import type { OAuthProvider } from '../../domain/ports/oauth-provider.port'
import { OAuthProviderError } from '../../domain/ports/oauth-provider.port'
import type { SecretBox } from '../../domain/ports/secret-box.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { Network } from '../../domain/publication/publication'
import { canAutoPublish, type SocialAccount } from '../../domain/social-account/social-account'
import { type SocialAccountView, toSocialAccountView } from '../mappers/views'

/** Margem mínima de validade ao entregar um token a um worker/rota. */
const FRESHNESS_MARGIN_MS = 60_000

export class AccountService {
  constructor(
    private readonly accounts: SocialAccountRepository,
    private readonly google: { provider: OAuthProvider; secretBox: SecretBox } | null,
    private readonly autoCapableNetworks: ReadonlySet<Network>,
    private readonly now: () => Date,
    private readonly logger: Logger,
  ) {}

  async list(): Promise<{ items: SocialAccountView[]; autoCapableNetworks: Network[] }> {
    const items = await this.accounts.list()
    return {
      items: items.map((account) =>
        toSocialAccountView(
          account,
          this.autoCapableNetworks.has(account.network) && canAutoPublish(account),
        ),
      ),
      autoCapableNetworks: [...this.autoCapableNetworks],
    }
  }

  /**
   * Desconecta: revoga no provedor (best-effort), ZERA os tokens selados e marca
   * `revoked`. NÃO apaga a linha — os snapshots de métrica têm FK e o histórico
   * importa.
   */
  async disconnect(id: string): Promise<SocialAccountView> {
    const account = await this.accounts.byId(id)
    if (!account) throw new AccountNotFoundError()
    if (this.google && account.refreshTokenEnc) {
      try {
        await this.google.provider.revoke(this.google.secretBox.open(account.refreshTokenEnc))
      } catch {
        // selo ilegível/rede fora: a desconexão local acontece de qualquer forma
      }
    }
    const expectedVersion = account.version
    account.accessTokenEnc = null
    account.refreshTokenEnc = null
    account.tokenExpiresAt = null
    account.refreshExpiresAt = null
    account.status = 'revoked'
    account.version = expectedVersion + 1
    account.updatedAt = this.now()
    const ok = await this.accounts.update(account, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    return toSocialAccountView(account, false)
  }

  /** Primeira conta CONECTADA da rede (Drive/publisher). Nenhuma → 409. */
  async getConnectedAccount(network: Network): Promise<SocialAccount> {
    const accounts = await this.accounts.listByNetwork(network)
    const connected = accounts.find((a) => a.status === 'connected')
    if (!connected) throw new AccountNotConnectedError()
    return connected
  }

  /**
   * Access token FRESCO da conta (só em memória — nunca persistir em claro).
   * Vencendo dentro da margem → refresh inline + persiste selado. `invalid_grant`
   * → conta vira `needs_reauth` e o chamador recebe 409 (CTA "reconecte").
   * `marginMs` maior = refresh PROATIVO (token-refresh-worker).
   */
  async getFreshAccessToken(
    account: SocialAccount,
    marginMs: number = FRESHNESS_MARGIN_MS,
  ): Promise<string> {
    if (!this.google) throw new OAuthNotConfiguredError()
    const now = this.now()
    if (
      account.accessTokenEnc &&
      account.tokenExpiresAt &&
      account.tokenExpiresAt.getTime() > now.getTime() + marginMs
    ) {
      return this.google.secretBox.open(account.accessTokenEnc)
    }
    if (!account.refreshTokenEnc) {
      await this.markNeedsReauth(account, 'Sem refresh token — reconecte a conta')
      throw new AccountNotConnectedError('A conta do Google precisa ser reconectada')
    }
    try {
      const refreshed = await this.google.provider.refresh(
        this.google.secretBox.open(account.refreshTokenEnc),
      )
      const at = this.now()
      const expectedVersion = account.version
      account.accessTokenEnc = this.google.secretBox.seal(refreshed.accessToken)
      if (refreshed.refreshToken) {
        account.refreshTokenEnc = this.google.secretBox.seal(refreshed.refreshToken)
      }
      account.tokenExpiresAt = refreshed.expiresInSeconds
        ? new Date(at.getTime() + refreshed.expiresInSeconds * 1000)
        : null
      if (refreshed.refreshExpiresInSeconds) {
        account.refreshExpiresAt = new Date(at.getTime() + refreshed.refreshExpiresInSeconds * 1000)
      }
      account.lastRefreshAt = at
      account.lastRefreshError = null
      account.version = expectedVersion + 1
      account.updatedAt = at
      // Conflito de versão aqui é inócuo (outro caminho renovou primeiro) — o
      // token fresco em mãos continua válido.
      await this.accounts.update(account, expectedVersion)
      return refreshed.accessToken
    } catch (error) {
      if (error instanceof OAuthProviderError && error.permanent) {
        await this.markNeedsReauth(account, error.message)
        throw new AccountNotConnectedError('A conta do Google precisa ser reconectada')
      }
      throw error
    }
  }

  private async markNeedsReauth(account: SocialAccount, reason: string): Promise<void> {
    this.logger.error('account.needs_reauth', { accountId: account.id, reason })
    const expectedVersion = account.version
    account.status = 'needs_reauth'
    account.lastRefreshError = reason
    account.version = expectedVersion + 1
    account.updatedAt = this.now()
    await this.accounts.update(account, expectedVersion)
  }
}
