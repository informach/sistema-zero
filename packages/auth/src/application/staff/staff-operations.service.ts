import { sha256Hex } from '@sistemazero/core/security'
import {
  type StaffOperation,
  staffCanonical,
  staffMutation,
  staffRoles,
} from '@sistemazero/core/staff'
import type { AuditLogRepository } from '../../domain/ports/audit-log-repository.port'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { TokenIssuer } from '../../domain/ports/token-issuer.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { ForbiddenError, UnauthorizedError } from '../../interfaces/http/errors'
import { toUserView } from '../mappers/user-view'

export interface StaffGateway {
  execute(
    operation: StaffOperation,
    actorId: string,
    accessToken: string,
  ): Promise<{ status: number; value: unknown }>
}
export class StaffOperationsService {
  constructor(
    private users: UserRepository,
    private sessions: RefreshTokenRepository,
    private issuer: TokenIssuer,
    private audit: AuditLogRepository,
    private gateway: StaffGateway,
  ) {}
  async execute(accessToken: string, refreshToken: string, operation: StaffOperation) {
    const claims = await this.issuer.verifyAccessToken(accessToken)
    const session = await this.sessions.findByHash(sha256Hex(refreshToken))
    if (
      !claims ||
      !session ||
      claims.sub !== session.userId ||
      claims.act ||
      claims.pfl ||
      claims.kids ||
      session.impersonatorUserId ||
      session.activeProfileId ||
      session.kidsContext ||
      session.rotatedAt ||
      session.revokedAt ||
      session.familyRevokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.familyExpiresAt.getTime() <= Date.now()
    )
      throw new UnauthorizedError('Sessão vigente da conta necessária')
    const user = await this.users.findById(session.userId)
    if (!user?.isActive() || !user.isPasswordSet() || !staffRoles(operation).includes(user.role))
      throw new ForbiddenError('Permissão atual insuficiente para esta operação')
    const mutation = staffMutation(operation)
    if (operation.action === 'identity') return { status: 200, value: { user: toUserView(user) } }
    const digest = sha256Hex(staffCanonical(operation))
    const audit = (status: number) =>
      this.audit.create({
        id: crypto.randomUUID(),
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: `staff.${operation.action}`,
        method: 'POST',
        path: '/auth/staff/operations',
        targetId: digest,
        requestId: operation.action === 'messages.send' ? operation.message.intentId : null,
        status,
      })
    // Durable intent before dispatch; no message body, credential or OTP in audit.
    if (mutation) await audit(102)
    const result = await this.gateway.execute(operation, user.id, accessToken)
    if (mutation) await audit(result.status)
    return result
  }
}
