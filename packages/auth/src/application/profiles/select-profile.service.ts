import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { ProfileNotFoundError } from '../../domain/profile/profile.errors'
import { UserNotActiveError } from '../../domain/user/user.errors'
import type { ImpersonationSessionValidator } from '../impersonation/impersonation-session-validator'
import { type ProfileView, toProfileView } from '../mappers/profile-view'
import type { AuthTokenService, AuthTokens, IssueContext } from '../tokens/auth-token.service'

export interface SelectProfileCommand {
  /** Conta do responsável (resolvida da sessão atual — conta OU perfil). */
  accountUserId: string
  profileId: string
  userAgent?: string | null
  ip?: string | null
  /**
   * Sessão de IMPERSONAÇÃO: id do admin navegando como a conta (claim `act.sub`,
   * injetado pelo gateway como `x-auth-impersonator-id`). Quando presente, o
   * vínculo de impersonação é PROPAGADO para a sessão de perfil emitida (TTL curto
   * + claim `act` + morre com o ator) — sem isso o select "lavaria" a impersonação
   * numa sessão de perfil normal de longa duração e sem rastro do ator.
   */
  impersonatorUserId?: string | null
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
    private readonly impersonationSessions: ImpersonationSessionValidator,
  ) {}

  async execute(cmd: SelectProfileCommand): Promise<{ profile: ProfileView; tokens: AuthTokens }> {
    const profile = await this.profiles.findById(cmd.profileId)
    // Ownership: perfil de outra conta / arquivado → 404 (não vaza a existência).
    if (!profile?.belongsTo(cmd.accountUserId) || profile.isArchived) {
      throw new ProfileNotFoundError()
    }
    const account = await this.users.findById(cmd.accountUserId)
    if (!account) throw new ProfileNotFoundError()
    if (!account.isActive()) throw new UserNotActiveError()

    // Propaga a impersonação (se houver): re-deriva a claim `act` do ATOR e marca a
    // família — a sessão de perfil herda o TTL curto e morre com o ator (a rotação
    // re-checa). Ator sumido/inativo entre o pedido e aqui → nega (não emite uma
    // sessão de suporte sem ator válido). Espelha a re-derivação do refresh.service.
    let impersonation: IssueContext['impersonation'] = null
    if (cmd.impersonatorUserId) {
      const actor = await this.impersonationSessions.validateActor(cmd.impersonatorUserId, account)
      if (!actor) throw new UserNotActiveError('Ator da impersonação indisponível')
      // Toda entrada/troca de perfil reinicia a capacidade de suporte.
      impersonation = {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      }
    }

    const tokens = await this.authTokens.issueForUser(account, {
      userAgent: cmd.userAgent,
      ip: cmd.ip,
      profile: {
        profileId: profile.id,
        claim: {
          accountId: account.id,
          name: profile.name,
          pub: profile.publicProfileEnabled,
        },
      },
      impersonation,
    })
    return { profile: toProfileView(profile), tokens }
  }
}
