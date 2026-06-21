import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'

/** Identidade PÚBLICA de um perfil (S2S): só nome + flag. NUNCA e-mail/telefone/nascimento/conta. */
export interface PublicProfileIdentity {
  name: string
  publicProfileEnabled: boolean
}

/**
 * Leitura S2S da identidade pública de um perfil, p/ o BFF do perfil público kids.
 * Perfil inexistente/arquivado/privado → 404 (não vaza nome de perfil sem opt-in).
 */
export class GetPublicProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(profileId: string): Promise<PublicProfileIdentity> {
    const profile = await this.profiles.findById(profileId)
    if (!profile || profile.isArchived || !profile.publicProfileEnabled)
      throw new ProfileNotFoundError()
    return { name: profile.name, publicProfileEnabled: profile.publicProfileEnabled }
  }
}
