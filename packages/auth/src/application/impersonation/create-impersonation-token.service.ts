import { randomBytes, randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import {
  ImpersonationForbiddenError,
  TargetNotImpersonableError,
} from '../../domain/impersonation/impersonation.errors'
import { canImpersonate } from '../../domain/impersonation/impersonation.policy'
import type { ImpersonationTokenRepository } from '../../domain/ports/impersonation-token-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { UserNotFoundError } from '../../domain/user/user.errors'
import type { UserRole } from '../../domain/user/user.role'

export interface CreateImpersonationTokenCommand {
  /** Admin/superadmin pedindo a impersonação (vem dos `X-Auth-User-*` do gateway). */
  actorId: string
  actorRole: UserRole
  targetUserId: string
}

export interface CreateImpersonationTokenOptions {
  /** TTL do handoff (curtíssimo — o token só atravessa a URL admin→community). */
  ttlSeconds: number
}

/**
 * Emite o token de HANDOFF de impersonação (single-use, TTL curtíssimo). A MATRIZ
 * é re-checada AQUI (defesa em profundidade — o gateway já barrou não-admins):
 * `superadmin` impersona qualquer um; `admin` só customer/staff (não escala para
 * agir como outro admin/superadmin); ninguém impersona a si mesmo.
 */
export class CreateImpersonationTokenService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: ImpersonationTokenRepository,
    private readonly opts: CreateImpersonationTokenOptions,
    private readonly logger: Logger,
  ) {}

  async execute(
    command: CreateImpersonationTokenCommand,
  ): Promise<{ token: string; expiresAt: Date }> {
    if (command.actorId === command.targetUserId) {
      throw new ValidationError('Não é possível impersonar a própria conta')
    }

    const target = await this.users.findById(command.targetUserId)
    if (!target) throw new UserNotFoundError()
    if (!target.isActive()) throw new TargetNotImpersonableError()

    if (!canImpersonate(command.actorRole, target.role)) throw new ImpersonationForbiddenError()

    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + this.opts.ttlSeconds * 1000)
    await this.tokens.create({
      id: randomUUID(),
      tokenHash: sha256Hex(token),
      actorId: command.actorId,
      targetUserId: command.targetUserId,
      expiresAt,
    })

    // Trilha de auditoria: quem pediu para entrar como quem (ids, sem PII).
    this.logger.info('auth.impersonation.requested', {
      actorId: command.actorId,
      actorRole: command.actorRole,
      targetUserId: command.targetUserId,
    })

    return { token, expiresAt }
  }
}
