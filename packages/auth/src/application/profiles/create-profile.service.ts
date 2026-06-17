import type { ProfileAllowanceGateway } from '../../domain/ports/profile-allowance-gateway.port'
import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import { ProfileAggregate } from '../../domain/profile/profile.aggregate'
import { ProfileLimitReachedError } from '../../domain/profile/profile.errors'
import { type ProfileView, toProfileView } from '../mappers/profile-view'

export interface CreateProfileCommand {
  /** Conta do responsável (x-auth-user-id) — dona do perfil. */
  accountUserId: string
  name: string
  avatarUrl?: string | null
  whatsapp?: string | null
}

/**
 * Cria um perfil de criança para a conta. O teto vem do members (matrícula kids
 * ativa). `maxProfiles <= 0` = a conta não comprou → 409. A contagem + insert são
 * atômicos no repositório (advisory lock por conta) — dois creates simultâneos não
 * furam o teto.
 */
export class CreateProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly allowance: ProfileAllowanceGateway,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(cmd: CreateProfileCommand): Promise<ProfileView> {
    // Constrói o agregado ANTES da chamada S2S — valida nome/foto na borda do domínio.
    const profile = ProfileAggregate.create({
      id: this.newId(),
      accountUserId: cmd.accountUserId,
      name: cmd.name,
      avatarUrl: cmd.avatarUrl,
      whatsapp: cmd.whatsapp,
      now: this.clock(),
    })
    const { maxProfiles } = await this.allowance.getAllowance(cmd.accountUserId)
    if (maxProfiles <= 0) throw new ProfileLimitReachedError()
    const result = await this.profiles.createWithinLimit(profile, maxProfiles)
    if (result.outcome === 'limit_reached') throw new ProfileLimitReachedError()
    return toProfileView(result.profile)
  }
}
