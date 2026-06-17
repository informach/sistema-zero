import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'
import { type ProfileView, toProfileView } from '../mappers/profile-view'

export interface UpdateProfileDetailsCommand {
  accountUserId: string
  profileId: string
  name?: string
  avatarUrl?: string | null
  whatsapp?: string | null
}

/**
 * Edita nome/foto/WhatsApp de um perfil DA PRÓPRIA CONTA. Ownership: perfil de
 * outra conta ou arquivado → 404 (não vaza a existência). A validação de foto
 * (http(s)) vive no agregado.
 */
export class UpdateProfileDetailsService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(cmd: UpdateProfileDetailsCommand): Promise<ProfileView> {
    const profile = await this.profiles.findById(cmd.profileId)
    if (!profile || !profile.belongsTo(cmd.accountUserId) || profile.isArchived) {
      throw new ProfileNotFoundError()
    }
    profile.updateDetails(
      { name: cmd.name, avatarUrl: cmd.avatarUrl, whatsapp: cmd.whatsapp },
      this.clock(),
    )
    const ok = await this.profiles.update(profile)
    if (!ok) throw new ProfileNotFoundError()
    return toProfileView(profile)
  }
}
