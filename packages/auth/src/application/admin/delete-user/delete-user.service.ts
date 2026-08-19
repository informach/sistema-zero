import { ForbiddenError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import type { UserRole } from '../../../domain/user/user.role'
import type { DeleteUserCommand } from './delete-user.command'

/** Papéis que NUNCA podem ser excluídos por esta rota (contas operacionais). */
const PROTECTED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'superadmin'])

/**
 * Exclusão FÍSICA de um usuário pelo painel (limpeza de contas de teste/lixo). É
 * destrutiva e irreversível — apaga a identidade + os dados auth-owned keyados nela
 * (o painel orquestra a purga em members/hub ANTES; financeiro/fiscal são retidos).
 *
 * Guards (defesa em profundidade — o gateway já restringe a rota a `superadmin`):
 *  - SÓ `superadmin` executa;
 *  - ninguém exclui a SI MESMO (anti-lockout);
 *  - contas `admin`/`superadmin` NÃO podem ser excluídas (proteção operacional).
 */
export class DeleteUserService {
  constructor(
    private readonly users: UserRepository,
    private readonly logger: Logger,
  ) {}

  /** Bloqueia a conta e captura todos os donos de dados antes da purga externa. */
  async prepare(command: DeleteUserCommand): Promise<{ profileIds: string[]; completed?: true }> {
    this.assertActorAllowed(command)
    const user = await this.users.findById(command.targetId)
    if (!user) {
      const receipt = await this.users.findDeletionReceipt(command.targetId)
      if (!receipt) throw new UserNotFoundError()
      return { ...receipt, completed: true }
    }
    this.assertTargetAllowed(user.role)
    const prepared = await this.users.prepareDeletion(user.id)
    if (!prepared) throw new UserNotFoundError()
    this.logger.info('admin.user.deletion_prepared', {
      userId: user.id,
      profileCount: prepared.profileIds.length,
      by: command.actor.id,
    })
    return prepared
  }

  async execute(command: DeleteUserCommand): Promise<void> {
    this.assertActorAllowed(command)
    const user = await this.users.findById(command.targetId)
    if (!user) {
      if (await this.users.findDeletionReceipt(command.targetId)) return
      throw new UserNotFoundError()
    }
    this.assertTargetAllowed(user.role)
    await this.users.deleteById(user.id)

    this.logger.info('admin.user.deleted', {
      userId: user.id,
      email: user.email,
      role: user.role,
      by: command.actor.id,
    })
  }

  private assertActorAllowed(command: DeleteUserCommand): void {
    const { targetId, actor } = command
    if (actor.role !== 'superadmin') {
      throw new ForbiddenError('Apenas superadmin pode excluir usuários')
    }
    if (actor.id === targetId) {
      throw new ForbiddenError('Você não pode excluir a própria conta')
    }
  }

  private assertTargetAllowed(role: UserRole): void {
    if (PROTECTED_ROLES.has(role)) {
      throw new ForbiddenError('Contas admin/superadmin não podem ser excluídas')
    }
  }
}
