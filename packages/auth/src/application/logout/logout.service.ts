import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'

export interface LogoutCommand {
  refreshToken: string
  /** true = revoga TODAS as sessões do usuário (todos os dispositivos/famílias). */
  allSessions?: boolean
}

/** Caso de uso de logout: encerra a família apresentada (ou todas). Idempotente. */
export class LogoutService {
  constructor(private readonly refreshTokens: RefreshTokenRepository) {}

  async execute(command: LogoutCommand): Promise<void> {
    const presented = command.refreshToken?.trim()
    // Logout é idempotente: token ausente/desconhecido é no-op (sempre 200).
    if (!presented) return

    const record = await this.refreshTokens.findByHash(sha256Hex(presented))
    if (!record) return

    // "Todas as sessões" = TODAS as famílias do usuário (cada login/dispositivo
    // inicia uma família própria — revogar só a família do token apresentado
    // deixaria os outros dispositivos logados). ⚠️ Com o refresh de um ALUNO do Kids o
    // pedido vale só para a sessão dele: o `userId` da família é a CONTA, e o aluno
    // derrubaria o responsável e os irmãos em todos os aparelhos.
    if (command.allSessions && record.kidsContext?.kind !== 'student')
      await this.refreshTokens.revokeAllForUser(record.userId)
    else await this.refreshTokens.revokeFamily(record.familyId)
  }
}
