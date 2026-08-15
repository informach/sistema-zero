import type { ProfileRepository } from '../../../domain/ports/profile-repository.port'

export interface BatchProfileView {
  id: string
  accountUserId: string
  name: string
  publicProfileEnabled: boolean
}

/** Identidade mínima de perfis ativos ou arquivados em lote para telas administrativas. */
export class BatchGetProfilesService {
  constructor(private readonly profiles: ProfileRepository) {}

  async execute(ids: string[]): Promise<{ profiles: BatchProfileView[] }> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) return { profiles: [] }
    const found = await this.profiles.listByIds(unique)
    return {
      profiles: found.map((profile) => ({
        id: profile.id,
        accountUserId: profile.accountUserId,
        name: profile.name,
        publicProfileEnabled: profile.publicProfileEnabled,
      })),
    }
  }
}
