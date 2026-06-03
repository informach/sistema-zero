import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { type AdminUserView, toAdminUserView } from '../../mappers/admin-user-view'
import type { ListUsersCommand } from './list-users.command'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface ListUsersResult {
  items: AdminUserView[]
  total: number
  limit: number
  offset: number
}

/** Caso de uso de listagem admin de usuários (paginada + filtros q/role/status). */
export class ListUsersService {
  constructor(private readonly users: UserRepository) {}

  async execute(command: ListUsersCommand): Promise<ListUsersResult> {
    const limit = clamp(command.limit, 1, MAX_LIMIT, DEFAULT_LIMIT)
    const offset =
      Number.isFinite(command.offset) && command.offset > 0 ? Math.trunc(command.offset) : 0

    const { users, total } = await this.users.list({
      q: command.q?.trim() || undefined,
      role: command.role,
      status: command.status,
      limit,
      offset,
    })

    return { items: users.map(toAdminUserView), total, limit, offset }
  }
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
