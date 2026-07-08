import type { Logger } from '@sistemazero/core/logging'
import type { GmailConnection } from '../../domain/connection/gmail-connection'
import { ConnectionNotConnectedError, GmailNotConfiguredError } from '../../domain/helpdesk-errors'
import type { ConnectionRepository } from '../../domain/ports/connection-repository.port'
import { type OAuthProvider, OAuthProviderError } from '../../domain/ports/oauth-provider.port'
import type { SecretBox } from '../../domain/ports/secret-box.port'

/** Margem mínima de validade ao entregar um token a uma rota/worker. */
const FRESHNESS_MARGIN_MS = 60_000

export interface GmailAccountDeps {
  provider: OAuthProvider
  secretBox: SecretBox
}

/**
 * Entrega um access token FRESCO da conexão Gmail (refresh LAZY): o poller
 * mantém tudo renovado sem worker dedicado. `invalid_grant` → conexão vira
 * `needs_reauth` (o card em Configurações pede reconectar).
 */
export class GmailAccountService {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly deps: GmailAccountDeps | null,
    private readonly now: () => Date,
    private readonly logger: Logger,
  ) {}

  /**
   * Access token só em memória (nunca persistir em claro). Vencendo dentro da
   * margem → refresh inline + persiste selado. `invalid_grant` → `needs_reauth`
   * + ConnectionNotConnectedError. `marginMs` maior = refresh PROATIVO.
   */
  async getFreshAccessToken(
    connection: GmailConnection,
    marginMs: number = FRESHNESS_MARGIN_MS,
  ): Promise<string> {
    if (!this.deps) throw new GmailNotConfiguredError()
    const { provider, secretBox } = this.deps
    const now = this.now()
    if (
      connection.accessTokenEnc &&
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt.getTime() > now.getTime() + marginMs
    ) {
      return secretBox.open(connection.accessTokenEnc)
    }
    if (!connection.refreshTokenEnc) {
      await this.markNeedsReauth(connection, 'Sem refresh token — reconecte a caixa')
      throw new ConnectionNotConnectedError('A caixa precisa ser reconectada')
    }
    try {
      const refreshed = await provider.refresh(secretBox.open(connection.refreshTokenEnc))
      const at = this.now()
      connection.accessTokenEnc = secretBox.seal(refreshed.accessToken)
      if (refreshed.refreshToken) {
        connection.refreshTokenEnc = secretBox.seal(refreshed.refreshToken)
      }
      connection.tokenExpiresAt = refreshed.expiresInSeconds
        ? new Date(at.getTime() + refreshed.expiresInSeconds * 1000)
        : null
      connection.updatedAt = at
      // Escritor único (o sync-worker claima a conexão) → update sem versão.
      await this.connections.update(connection)
      return refreshed.accessToken
    } catch (error) {
      if (error instanceof OAuthProviderError && error.permanent) {
        await this.markNeedsReauth(connection, error.message)
        throw new ConnectionNotConnectedError('A caixa precisa ser reconectada')
      }
      throw error
    }
  }

  private async markNeedsReauth(connection: GmailConnection, reason: string): Promise<void> {
    this.logger.error('gmail.needs_reauth', { connectionId: connection.id, reason })
    connection.status = 'needs_reauth'
    connection.lastSyncError = reason
    connection.updatedAt = this.now()
    await this.connections.update(connection)
  }
}
