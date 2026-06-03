import type { UserRole } from '../../../domain/user/user.role'
import type { UserStatus } from '../../../domain/user/user.status'

/** Quem executa a ação — resolvido dos headers `X-Auth-User-*` injetados pelo gateway. */
export interface UpdateUserActor {
  id: string
  role: UserRole
}

/** Campos alteráveis pelo admin. `undefined` = não mexer no campo. */
export interface UpdateUserChanges {
  role?: UserRole
  status?: UserStatus
  firstName?: string
  lastName?: string
  phone?: string | null
}

export interface UpdateUserCommand {
  targetId: string
  actor: UpdateUserActor
  changes: UpdateUserChanges
  /** Token de concorrência otimista (opcional): a `version` que o cliente leu. */
  expectedVersion?: number
}
