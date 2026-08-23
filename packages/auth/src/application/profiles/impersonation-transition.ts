import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import { InvalidRefreshTokenError } from '../../domain/user/user.errors'

/**
 * Resolve o deadline autoritativo da família que está originando uma troca de
 * perfil. O access prova a identidade; o refresh vigente prova qual família de
 * suporte pode criar a sessão derivada sem renovar seu prazo absoluto.
 */
export async function impersonationTransitionDeadline(
  refreshTokens: RefreshTokenRepository,
  presented: string | null | undefined,
  expectedActorId: string,
  expectedTargetUserId: string,
): Promise<Date> {
  const refreshToken = presented?.trim()
  if (!refreshToken) throw new InvalidRefreshTokenError()
  const record = await refreshTokens.findByHash(sha256Hex(refreshToken))
  const now = Date.now()
  if (
    !record ||
    record.userId !== expectedTargetUserId ||
    record.impersonatorUserId !== expectedActorId ||
    record.rotatedAt ||
    record.revokedAt ||
    record.familyRevokedAt ||
    record.expiresAt.getTime() <= now ||
    record.familyExpiresAt.getTime() <= now
  ) {
    throw new InvalidRefreshTokenError()
  }
  return record.familyExpiresAt
}
