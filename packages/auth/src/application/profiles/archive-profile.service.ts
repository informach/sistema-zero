import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'
import { ParentReauthenticationRequiredError } from '../../domain/study-access/errors'

export interface ArchiveProfileCommand {
  accountUserId: string
  profileId: string
  /** Sessão de responsável do Kids com login recente? `undefined` = outro produto. */
  parentAuthRecent?: boolean
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
    if (!profile?.belongsTo(cmd.accountUserId)) throw new ProfileNotFoundError()
    if (profile.isArchived) return
    // Arquivar encerra o acesso da criança: no Kids exige o responsável com login recente.
    if (cmd.parentAuthRecent === false) throw new ParentReauthenticationRequiredError()
    profile.archive(this.clock())
    await this.profiles.update(profile)
  }
}
