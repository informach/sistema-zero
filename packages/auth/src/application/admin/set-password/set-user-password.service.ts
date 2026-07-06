import { ForbiddenError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port'
import type { RefreshTokenRepository } from '../../../domain/ports/refresh-token-repository.port'
import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { UserNotFoundError, VersionConflictError } from '../../../domain/user/user.errors'
import type { UserRole } from '../../../domain/user/user.role'
import { assertPasswordPolicy } from '../../../domain/value-objects/password-policy'

/** Papéis privilegiados que só `superadmin` pode ter a senha redefinida (espelha o create/update-user). */
const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'superadmin'])

export interface SetUserPasswordOptions {
  passwordMinLength: number
}

export interface SetUserPasswordActor {
  id: string
  role: UserRole
}

export interface SetUserPasswordCommand {
  actor: SetUserPasswordActor
  targetId: string
  newPassword: string
}

/**
 * DEFINE a senha de um usuário pelo painel admin (suporte: cliente preso sem senha).
 * Troca o hash — o que CARIMBA `passwordSetAt` (destrava o login por código + a área
 * dos pais) — e REVOGA todas as sessões do alvo (a senha antiga não vale mais).
 * Guards hierárquicos (defesa em profundidade sobre o RBAC do gateway): `admin` não
 * redefine a senha de admin/superadmin; nunca a si mesmo (o admin troca a própria em
 * `/auth/me/password`). O operador informa a nova senha ao cliente por fora.
 */
export class SetUserPasswordService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly opts: SetUserPasswordOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: SetUserPasswordCommand): Promise<{ ok: true }> {
    if (command.actor.id === command.targetId) {
      throw new ForbiddenError('Use "trocar minha senha" para a sua própria conta')
    }
    assertPasswordPolicy(command.newPassword, this.opts.passwordMinLength)

    const user = await this.users.findById(command.targetId)
    if (!user) throw new UserNotFoundError()

    if (command.actor.role !== 'superadmin' && PRIVILEGED_ROLES.has(user.role)) {
      throw new ForbiddenError('Apenas superadmin pode redefinir a senha de admin/superadmin')
    }

    const baseVersion = user.version
    user.changePassword(await this.hasher.hash(command.newPassword))
    const updated = await this.users.update(user, baseVersion)
    if (!updated) throw new VersionConflictError()

    // Senha trocada = sessões antigas não valem mais (mitiga conta comprometida).
    await this.refreshTokens.revokeAllForUser(user.id)
    this.logger.info('admin.user.password_set', {
      userId: user.id,
      by: command.actor.id,
    })
    return { ok: true }
  }
}
