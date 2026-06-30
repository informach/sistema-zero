import type { UserRole } from '../../../domain/user/user.role'

/** Quem executa a exclusão — resolvido dos headers `X-Auth-User-*` do gateway. */
export interface DeleteUserActor {
  id: string
  role: UserRole
}

export interface DeleteUserCommand {
  targetId: string
  actor: DeleteUserActor
}
