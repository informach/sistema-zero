import { ForbiddenError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import type { RefreshTokenRepository } from '../../../domain/ports/refresh-token-repository.port'
import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { UserNotFoundError, VersionConflictError } from '../../../domain/user/user.errors'
import type { UserRole } from '../../../domain/user/user.role'
import type { UserStatus } from '../../../domain/user/user.status'
import { type AdminUserView, toAdminUserView } from '../../mappers/admin-user-view'
import type { UpdateUserActor, UpdateUserChanges, UpdateUserCommand } from './update-user.command'

/** Papéis privilegiados que só `superadmin` pode gerenciar/conceder. */
const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'superadmin'])
/** Status que, ao serem aplicados, derrubam as sessões vigentes do alvo. */
const INACTIVE_STATUSES: ReadonlySet<UserStatus> = new Set<UserStatus>(['suspended', 'blocked'])

/**
 * Edição admin de usuário (status / papel / perfil). Aplica os GUARDS hierárquicos
 * como DEFESA EM PROFUNDIDADE (o gateway já barrou não-admins):
 *  - ninguém altera o PRÓPRIO papel/status (anti-lockout);
 *  - `admin` não toca em alvo `admin`/`superadmin`, nem promove a esses papéis;
 *  - `superadmin` não tem trava de hierarquia.
 * Suspender/bloquear revoga as sessões vigentes. Concorrência otimista por `version`.
 */
export class UpdateUserService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateUserCommand): Promise<AdminUserView> {
    const { targetId, actor, changes, expectedVersion } = command

    const user = await this.users.findById(targetId)
    if (!user) throw new UserNotFoundError()

    // Concorrência otimista: se o cliente mandou a versão que leu e ela já mudou, 409.
    if (expectedVersion !== undefined && expectedVersion !== user.version) {
      throw new VersionConflictError()
    }

    this.authorize(actor, targetId, user.role, changes)

    const baseVersion = user.version
    const previousStatus = user.status

    if (changes.role !== undefined) user.changeRole(changes.role)
    if (changes.status !== undefined) user.changeStatus(changes.status)
    user.updateProfile({
      firstName: changes.firstName,
      lastName: changes.lastName,
      phone: changes.phone,
    })

    // Nada mudou de fato → idempotente, sem escrita no banco.
    if (user.version === baseVersion) return toAdminUserView(user)

    const saved = await this.users.update(user, baseVersion)
    if (!saved) throw new VersionConflictError()

    // Suspender/bloquear derruba as sessões vigentes (não podem mais renovar).
    if (user.status !== previousStatus && INACTIVE_STATUSES.has(user.status)) {
      await this.refreshTokens.revokeAllForUser(user.id)
      this.logger.info('admin.user.sessions_revoked', {
        userId: user.id,
        status: user.status,
        by: actor.id,
      })
    }

    this.logger.info('admin.user.updated', {
      userId: user.id,
      by: actor.id,
      version: user.version,
    })
    return toAdminUserView(user)
  }

  /** Guards hierárquicos (defesa em profundidade). Lança `ForbiddenError` (→ 403). */
  private authorize(
    actor: UpdateUserActor,
    targetId: string,
    targetRole: UserRole,
    changes: UpdateUserChanges,
  ): void {
    if (actor.role !== 'superadmin' && actor.role !== 'admin') {
      throw new ForbiddenError('Sem permissão para administrar usuários')
    }

    const mutatesRoleOrStatus = changes.role !== undefined || changes.status !== undefined
    // Anti-lockout: ninguém altera o próprio papel/status (perfil de si mesmo é ok).
    if (actor.id === targetId && mutatesRoleOrStatus) {
      throw new ForbiddenError('Você não pode alterar o próprio papel ou status')
    }

    if (actor.role === 'superadmin') return // sem trava de hierarquia

    // admin: só gerencia staff/customer — não toca em admin/superadmin nem promove a eles.
    if (PRIVILEGED_ROLES.has(targetRole)) {
      throw new ForbiddenError('Apenas superadmin pode gerenciar contas admin/superadmin')
    }
    if (changes.role !== undefined && PRIVILEGED_ROLES.has(changes.role)) {
      throw new ForbiddenError('Apenas superadmin pode conceder o papel admin/superadmin')
    }
  }
}
