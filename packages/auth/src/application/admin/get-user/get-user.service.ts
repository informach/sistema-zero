import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { type AdminUserView, toAdminUserView } from '../../mappers/admin-user-view'

/** Caso de uso: detalhe de um usuário pelo id (painel admin). `null` se não existir. */
export class GetUserService {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<AdminUserView | null> {
    const user = await this.users.findById(userId)
    return user ? toAdminUserView(user) : null
  }
}
