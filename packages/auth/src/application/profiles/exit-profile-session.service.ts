import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import {
  InvalidCredentialsError,
  UserNotActiveError,
  UserNotFoundError,
} from '../../domain/user/user.errors'
import type { ImpersonationSessionValidator } from '../impersonation/impersonation-session-validator'
import type { AuthTokenService, AuthTokens, IssueContext } from '../tokens/auth-token.service'

export interface ExitProfileSessionCommand {
  /** Conta do responsável (x-auth-account-id da sessão de perfil). */
  accountUserId: string
  /** Senha do responsável — gate da "área dos pais" (a criança não a tem). */
  password: string
  userAgent?: string | null
  ip?: string | null
  /** Mantém o vínculo de suporte ao voltar à conta, sempre reiniciando em readonly. */
  impersonatorUserId?: string | null
}

/**
 * Sai do perfil de volta à sessão da CONTA — a "área dos pais" (gerenciar perfis,
 * ver compras, mexer na conta). Gateado pela SENHA do responsável (a decisão de
 * produto permite "PIN OU a senha"; o PIN curto é uma comodidade futura). Emite uma
 * sessão de conta NOVA (sem `pfl`) — o BFF troca os cookies e a gestão fica liberada.
 */
export class ExitProfileSessionService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly authTokens: AuthTokenService,
    private readonly impersonationSessions: ImpersonationSessionValidator,
  ) {}

  async execute(cmd: ExitProfileSessionCommand): Promise<{ tokens: AuthTokens }> {
    const account = await this.users.findById(cmd.accountUserId)
    if (!account) throw new UserNotFoundError()
    if (!account.isActive()) throw new UserNotActiveError()
    const ok = await this.hasher.verify(cmd.password, account.passwordHash)
    if (!ok) throw new InvalidCredentialsError()

    let impersonation: IssueContext['impersonation'] = null
    if (cmd.impersonatorUserId) {
      const actor = await this.impersonationSessions.validateActor(cmd.impersonatorUserId, account)
      if (!actor) {
        throw new UserNotActiveError('Ator da impersonação indisponível')
      }
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
      impersonation,
    })
    return { tokens }
  }
}
