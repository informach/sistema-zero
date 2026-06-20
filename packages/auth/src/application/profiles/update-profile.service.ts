import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'
import { type ProfileView, toProfileView } from '../mappers/profile-view'

export interface UpdateProfileDetailsCommand {
  accountUserId: string
  profileId: string
  name?: string
  avatarUrl?: string | null
  whatsapp?: string | null
  /**
   * Data de nascimento (`YYYY-MM-DD`; `null` limpa). A AUTORIZAÇÃO (só os pais) é da
   * rota — quando chega aqui já está liberada. `undefined` = não mexe.
   */
  birthDate?: string | null
  /** Perfil público (opt-in). AUTORIZAÇÃO parent-only é da rota; `undefined` = não mexe. */
  publicProfileEnabled?: boolean
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
    if (!profile?.belongsTo(cmd.accountUserId) || profile.isArchived) {
      throw new ProfileNotFoundError()
    }
    const now = this.clock()
    profile.updateDetails({ name: cmd.name, avatarUrl: cmd.avatarUrl, whatsapp: cmd.whatsapp }, now)
    // birthDate tem caminho próprio (autorização parent-only na rota; `undefined` = não mexe).
    if (cmd.birthDate !== undefined) profile.setBirthDate(cmd.birthDate, now)
    // Perfil público: idem (parent-only na rota).
    if (cmd.publicProfileEnabled !== undefined) {
      profile.setPublicProfileEnabled(cmd.publicProfileEnabled, now)
    }
    const ok = await this.profiles.update(profile)
    if (!ok) throw new ProfileNotFoundError()
    return toProfileView(profile)
  }
}
