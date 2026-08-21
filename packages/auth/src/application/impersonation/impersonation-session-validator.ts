import { canImpersonate } from '../../domain/impersonation/impersonation.policy'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import type { UserAggregate } from '../../domain/user/user.aggregate'

/**
 * Valida o ator FRESCO contra o alvo FRESCO antes de qualquer reemissão de uma
 * sessão de suporte. Centralizar esta regra impede que refresh/select/exit
 * apliquem matrizes diferentes quando papéis ou status mudam durante a sessão.
 */
export class ImpersonationSessionValidator {
  constructor(private readonly users: UserRepository) {}

  async validateActor(actorUserId: string, target: UserAggregate): Promise<UserAggregate | null> {
    const actor = await this.users.findById(actorUserId)
    if (!target.isActive() || !actor?.isActive()) return null
    return canImpersonate(actor.role, target.role) ? actor : null
  }
}
