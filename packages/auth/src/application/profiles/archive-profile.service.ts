import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'

export interface ArchiveProfileCommand {
  accountUserId: string
  profileId: string
}

/**
 * Arquiva um perfil DA PRÓPRIA CONTA (some da grade; o histórico keyado no id
 * sobrevive — nunca DELETE físico). Idempotente. Ownership: perfil de outra conta
 * → 404 (não vaza a existência).
 */
export class ArchiveProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(cmd: ArchiveProfileCommand): Promise<void> {
    const profile = await this.profiles.findById(cmd.profileId)
    if (!profile || !profile.belongsTo(cmd.accountUserId)) throw new ProfileNotFoundError()
    if (profile.isArchived) return
    profile.archive(this.clock())
    await this.profiles.update(profile)
  }
}
