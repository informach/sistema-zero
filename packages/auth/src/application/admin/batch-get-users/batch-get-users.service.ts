import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { type AdminUserView, toAdminUserView } from '../../mappers/admin-user-view'

export interface BatchGetUsersResult {
  users: AdminUserView[]
}

/**
 * Busca em LOTE de usuários por id — hidratação de identidade no painel admin
 * (ex.: a área de membros lista `userId`s e precisa de nome/email). Evita o N+1 de
 * chamar `GET /auth/admin/users/:id` por linha. Ids inexistentes são simplesmente
 * omitidos do resultado (não é erro).
 */
export class BatchGetUsersService {
  constructor(private readonly users: UserRepository) {}

  async execute(ids: string[]): Promise<BatchGetUsersResult> {
    // Deduplica preservando a chamada barata mesmo com ids repetidos.
    const unique = [...new Set(ids)]
    if (unique.length === 0) return { users: [] }
    const found = await this.users.listByIds(unique)
    return { users: found.map(toAdminUserView) }
  }
}
