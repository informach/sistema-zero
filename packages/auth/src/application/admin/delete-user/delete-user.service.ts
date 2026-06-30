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

  async execute(command: DeleteUserCommand): Promise<void> {
    const { targetId, actor } = command

    if (actor.role !== 'superadmin') {
      throw new ForbiddenError('Apenas superadmin pode excluir usuários')
    }
    if (actor.id === targetId) {
      throw new ForbiddenError('Você não pode excluir a própria conta')
    }

    const user = await this.users.findById(targetId)
    if (!user) throw new UserNotFoundError()

    if (PROTECTED_ROLES.has(user.role)) {
      throw new ForbiddenError('Contas admin/superadmin não podem ser excluídas')
    }

    await this.users.deleteById(targetId)

    this.logger.info('admin.user.deleted', {
      userId: targetId,
      email: user.email,
      role: user.role,
      by: actor.id,
    })
  }
}
