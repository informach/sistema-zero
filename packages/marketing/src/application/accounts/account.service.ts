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
import { buildSocialAccount } from './provider-account'

/** Margem mínima de validade ao entregar um token a um worker/rota. */
const FRESHNESS_MARGIN_MS = 60_000

export interface AccountOAuthDeps {
  /** youtube→Google; facebook E instagram→Meta (o mesmo provider). */
  providers: ReadonlyMap<Network, OAuthProvider>
  secretBox: SecretBox
}

export class AccountService {
  constructor(
    private readonly accounts: SocialAccountRepository,
    private readonly oauth: AccountOAuthDeps | null,
    private readonly autoCapableNetworks: ReadonlySet<Network>,
    private readonly now: () => Date,
    private readonly logger: Logger,
  ) {}

  private providerFor(network: Network): { provider: OAuthProvider; secretBox: SecretBox } {
    const provider = this.oauth?.providers.get(network)
    if (!this.oauth || !provider) throw new OAuthNotConfiguredError()
    return { provider, secretBox: this.oauth.secretBox }
  }

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
    const provider = this.oauth?.providers.get(account.network)
    if (this.oauth && provider && account.refreshTokenEnc) {
      try {
        await provider.revoke(this.oauth.secretBox.open(account.refreshTokenEnc))
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
   * `tokenExpiresAt === null` com token presente = token que NÃO expira (page
   * token da Meta) → devolve direto. Vencendo dentro da margem → refresh inline
   * + persiste selado. `invalid_grant` → conta vira `needs_reauth` e o chamador
   * recebe 409 (CTA "reconecte"). `marginMs` maior = refresh PROATIVO (worker).
   */
  async getFreshAccessToken(
    account: SocialAccount,
    marginMs: number = FRESHNESS_MARGIN_MS,
  ): Promise<string> {
    const { provider, secretBox } = this.providerFor(account.network)
    const now = this.now()
    if (account.accessTokenEnc && account.tokenExpiresAt === null) {
      return secretBox.open(account.accessTokenEnc)
    }
    if (
      account.accessTokenEnc &&
      account.tokenExpiresAt &&
      account.tokenExpiresAt.getTime() > now.getTime() + marginMs
    ) {
      return secretBox.open(account.accessTokenEnc)
    }
    if (!account.refreshTokenEnc) {
      await this.markNeedsReauth(account, 'Sem refresh token — reconecte a conta')
      throw new AccountNotConnectedError('A conta precisa ser reconectada')
    }
    try {
      const refreshed = await provider.refresh(secretBox.open(account.refreshTokenEnc))
      const at = this.now()
      const expectedVersion = account.version
      account.accessTokenEnc = secretBox.seal(refreshed.accessToken)
      if (refreshed.refreshToken) {
        account.refreshTokenEnc = secretBox.seal(refreshed.refreshToken)
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
        throw new AccountNotConnectedError('A conta precisa ser reconectada')
      }
      throw error
    }
  }

  /**
   * Renovação PROATIVA das contas derivadas de um consent (Meta: troca o USER
   * token 60d por um novo e re-deriva os page tokens de TODAS as contas irmãs
   * — o upsert atualiza cada uma). Falha permanente → `needs_reauth`.
   */
  async renewDerivedTokens(account: SocialAccount): Promise<void> {
    const { provider, secretBox } = this.providerFor(account.network)
    if (!provider.renewAccounts) return
    if (!account.refreshTokenEnc) {
      await this.markNeedsReauth(account, 'Sem token de renovação — reconecte a conta')
      return
    }
    try {
      const renewed = await provider.renewAccounts(secretBox.open(account.refreshTokenEnc))
      const at = this.now()
      for (const providerAccount of renewed) {
        await this.accounts.upsertByExternalId(
          buildSocialAccount({
            account: providerAccount,
            secretBox,
            connectedBy: account.connectedBy,
            now: at,
            id: crypto.randomUUID(),
          }),
        )
      }
      this.logger.info('account.renewed', {
        accountId: account.id,
        network: account.network,
        renewed: renewed.length,
      })
    } catch (error) {
      if (error instanceof OAuthProviderError && error.permanent) {
        await this.markNeedsReauth(account, error.message)
        return
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
