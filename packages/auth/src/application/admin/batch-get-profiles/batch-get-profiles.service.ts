import type { ProfileRepository } from '../../../domain/ports/profile-repository.port'

export interface BatchProfileView {
  id: string
  name: string
  publicProfileEnabled: boolean
}

/** Identidade mínima de perfis ativos em lote para telas administrativas. */
export class BatchGetProfilesService {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(ids: string[]): Promise<{ profiles: BatchProfileView[] }> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) return { profiles: [] }
    const found = await this.profiles.listActiveByIds(unique)
    return {
      profiles: found.map((profile) => ({
        id: profile.id,
        name: profile.name,
        publicProfileEnabled: profile.publicProfileEnabled,
      })),
    }
  }
}
