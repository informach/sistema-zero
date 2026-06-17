import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'
import { UserNotActiveError } from '../../domain/user/user.errors'
import { type ProfileView, toProfileView } from '../mappers/profile-view'
import type { AuthTokenService, AuthTokens } from '../tokens/auth-token.service'

export interface SelectProfileCommand {
  /** Conta do responsável (resolvida da sessão atual — conta OU perfil). */
  accountUserId: string
  profileId: string
  userAgent?: string | null
  ip?: string | null
}

/**
 * Entra num perfil de criança (a "troca de um clique" da Netflix). Emite uma SESSÃO
 * DE PERFIL: `sub` = profileId (atribuição de dados), `pfl.accountId` = a conta
 * (resolução de acesso). **Sem PIN** — entrar/trocar de perfil é livre; a senha do
 * responsável só protege a SAÍDA para a área dos pais (ver ExitProfileSessionService).
 * Aceita ser chamado tanto de uma sessão da conta quanto de outra sessão de perfil
 * (trocar de irmão direto) — o ownership é checado pelo `accountUserId` resolvido.
 */
export class SelectProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly users: UserRepository,
    private readonly authTokens: AuthTokenService,
  ) {}

  async execute(cmd: SelectProfileCommand): Promise<{ profile: ProfileView; tokens: AuthTokens }> {
    const profile = await this.profiles.findById(cmd.profileId)
    // Ownership: perfil de outra conta / arquivado → 404 (não vaza a existência).
    if (!profile || !profile.belongsTo(cmd.accountUserId) || profile.isArchived) {
      throw new ProfileNotFoundError()
    }
    const account = await this.users.findById(cmd.accountUserId)
    if (!account) throw new ProfileNotFoundError()
    if (!account.isActive()) throw new UserNotActiveError()

    const tokens = await this.authTokens.issueForUser(account, {
      userAgent: cmd.userAgent,
      ip: cmd.ip,
      activeProfileId: profile.id,
      profileClaim: { accountId: account.id, name: profile.name },
    })
    return { profile: toProfileView(profile), tokens }
  }
}
