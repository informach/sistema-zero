import type { UserRole } from '../../../domain/user/user.role'
import type { UserStatus } from '../../../domain/user/user.status'

/** Filtros da listagem admin de usuários. `limit`/`offset` já vêm coeridos da borda. */
export interface ListUsersCommand {
  q?: string
  role?: UserRole
  status?: UserStatus
  /** Origem do cadastro (match exato). */
  source?: string
  /** Janela de cadastro (createdAt) — Date já parseada na borda. */
  createdFrom?: Date
  createdTo?: Date
  limit: number
  offset: number
}
