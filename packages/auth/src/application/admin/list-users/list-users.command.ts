import type { UserRole } from '../../../domain/user/user.role'
import type { UserStatus } from '../../../domain/user/user.status'

/** Filtros da listagem admin de usuários. `limit`/`offset` já vêm coeridos da borda. */
export interface ListUsersCommand {
  q?: string
  role?: UserRole
  status?: UserStatus
  limit: number
  offset: number
}
