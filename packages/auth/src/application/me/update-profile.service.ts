import type { UserRepository } from '../../domain/ports/user-repository.port'
import { UserNotFoundError, VersionConflictError } from '../../domain/user/user.errors'
import { toUserView, type UserView } from '../mappers/user-view'

export interface UpdateProfileCommand {
  userId: string
  firstName?: string
  lastName?: string
  phone?: string | null
  avatarUrl?: string | null
}

/**
 * Self-service de perfil (`PATCH /auth/me`): o usuário edita nome/telefone/foto.
 * E-MAIL NÃO é editável aqui (é o vínculo com as compras no payments; troca de
 * e-mail é fluxo futuro com verificação). Papel/status são só do admin.
 */
export class UpdateProfileService {
  constructor(private readonly users: UserRepository) {}

  async execute(command: UpdateProfileCommand): Promise<UserView> {
    const user = await this.users.findById(command.userId)
    if (!user) throw new UserNotFoundError()

    const baseVersion = user.version
    user.updateProfile({
      firstName: command.firstName,
      lastName: command.lastName,
      phone: command.phone,
      avatarUrl: command.avatarUrl,
    })

    // No-op (nada mudou) não toca o banco.
    if (user.version !== baseVersion) {
      const updated = await this.users.update(user, baseVersion)
      if (!updated) throw new VersionConflictError()
    }
    return toUserView(user)
  }
}
