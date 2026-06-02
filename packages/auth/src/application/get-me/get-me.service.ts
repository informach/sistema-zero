import type { UserRepository } from '../../domain/ports/user-repository.port'
import { toUserView, type UserView } from '../mappers/user-view'

/**
 * Resolve o usuário autenticado pelo id (claim `sub` do access token verificado).
 *
 * É a materialização literal do contrato pedido: **retorna `null` se o usuário
 * não existir** e, se existir, `{ id, email, firstName, lastName, role, status,
 * phone?, signupSource? }`. A borda decide o status (token válido cujo usuário
 * sumiu → 401).
 */
export class GetMeService {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<UserView | null> {
    const user = await this.users.findById(userId)
    if (!user) return null
    return toUserView(user)
  }
}
