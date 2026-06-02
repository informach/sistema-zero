import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { InvalidCredentialsError, UserNotActiveError } from '../../domain/user/user.errors'
import type { UserStatus } from '../../domain/user/user.status'
import { toUserView, type UserView } from '../mappers/user-view'
import type { AuthTokenService, AuthTokens } from '../tokens/auth-token.service'

export interface LoginCommand {
  email: string
  password: string
  userAgent?: string | null
  ip?: string | null
}

export interface LoginServiceOptions {
  /**
   * Hash "isca" (de uma senha qualquer) verificado quando o e-mail NÃO existe —
   * iguala o tempo de resposta ao do caminho com usuário (anti-enumeração por timing).
   */
  dummyHash?: string
}

/** Caso de uso de login: valida credenciais (erro genérico) e emite tokens. */
export class LoginService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AuthTokenService,
    private readonly opts: LoginServiceOptions = {},
  ) {}

  async execute(command: LoginCommand): Promise<{ user: UserView; tokens: AuthTokens }> {
    const email = command.email.trim().toLowerCase()
    const user = await this.users.findByEmail(email)

    if (!user) {
      // Verifica contra o hash isca para não vazar (por timing) que o e-mail não existe.
      if (this.opts.dummyHash) await this.hasher.verify(command.password, this.opts.dummyHash)
      throw new InvalidCredentialsError()
    }

    const ok = await this.hasher.verify(command.password, user.passwordHash)
    if (!ok) throw new InvalidCredentialsError()
    if (!user.isActive()) throw new UserNotActiveError(statusMessage(user.status))

    const tokens = await this.tokens.issueForUser(user, {
      userAgent: command.userAgent,
      ip: command.ip,
    })
    return { user: toUserView(user), tokens }
  }
}

function statusMessage(status: UserStatus): string {
  switch (status) {
    case 'pending':
      return 'Conta pendente de ativação'
    case 'suspended':
      return 'Conta suspensa'
    case 'blocked':
      return 'Conta bloqueada'
    default:
      return 'Conta inativa'
  }
}
