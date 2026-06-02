import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'

export interface LogoutCommand {
  refreshToken: string
  /** true = revoga TODAS as sessões do usuário (a família inteira). */
  allSessions?: boolean
}

/** Caso de uso de logout: revoga o refresh apresentado (ou toda a família). Idempotente. */
export class LogoutService {
  constructor(private readonly refreshTokens: RefreshTokenRepository) {}

  async execute(command: LogoutCommand): Promise<void> {
    const presented = command.refreshToken?.trim()
    // Logout é idempotente: token ausente/desconhecido é no-op (sempre 200).
    if (!presented) return

    const record = await this.refreshTokens.findByHash(sha256Hex(presented))
    if (!record) return

    if (command.allSessions) await this.refreshTokens.revokeFamily(record.familyId)
    else await this.refreshTokens.revoke(record.id)
  }
}
