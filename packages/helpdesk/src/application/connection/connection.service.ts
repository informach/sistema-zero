import type { ConnectionRepository } from '../../domain/ports/connection-repository.port'
import { type ConnectionView, toConnectionView } from '../views'

/**
 * Estado da conexão Gmail para a UI (F0 expõe só a leitura; conectar/desconectar
 * entram na F1 com o fluxo OAuth).
 */
export class ConnectionService {
  constructor(private readonly connections: ConnectionRepository) {}

  async status(): Promise<ConnectionView> {
    return toConnectionView(await this.connections.current())
  }
}
