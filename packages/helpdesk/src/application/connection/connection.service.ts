import type { Logger } from '@sistemazero/core/logging'
import { ConnectionNotConnectedError } from '../../domain/helpdesk-errors'
import type { ConnectionRepository } from '../../domain/ports/connection-repository.port'
import type { OAuthProvider } from '../../domain/ports/oauth-provider.port'
import type { SecretBox } from '../../domain/ports/secret-box.port'
import { type ConnectionView, toConnectionView } from '../views'

export interface ConnectionRevokeDeps {
  provider: OAuthProvider
  secretBox: SecretBox
}

/** Estado e desconexão da conexão Gmail (a view NUNCA expõe tokens). */
export class ConnectionService {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly revokeDeps: ConnectionRevokeDeps | null,
    private readonly now: () => Date,
    private readonly logger: Logger,
  ) {}

  async status(): Promise<ConnectionView> {
    return toConnectionView(await this.connections.current())
  }

  /**
   * Desconecta: revoga no Google (best-effort), ZERA os tokens selados e marca
   * `revoked`. NÃO apaga a linha — o histórico de tickets/mensagens permanece.
   */
  async disconnect(): Promise<ConnectionView> {
    const connection = await this.connections.current()
    if (!connection) throw new ConnectionNotConnectedError()
    if (this.revokeDeps && connection.refreshTokenEnc) {
      try {
        await this.revokeDeps.provider.revoke(
          this.revokeDeps.secretBox.open(connection.refreshTokenEnc),
        )
      } catch {
        // selo ilegível/rede fora: a desconexão local acontece de qualquer forma
      }
    }
    connection.accessTokenEnc = null
    connection.refreshTokenEnc = null
    connection.tokenExpiresAt = null
    connection.status = 'revoked'
    connection.lastSyncError = null
    connection.version += 1
    connection.updatedAt = this.now()
    await this.connections.update(connection)
    this.logger.info('gmail.disconnected', { email: connection.emailAddress })
    return toConnectionView(await this.connections.current())
  }
}
