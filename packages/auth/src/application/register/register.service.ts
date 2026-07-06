import { ValidationError } from '@sistemazero/core/errors'
import type { Logger } from '@sistemazero/core/logging'
import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { UserAggregate } from '../../domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../domain/user/user.errors'
import { Email } from '../../domain/value-objects/email'
import { assertPasswordPolicy } from '../../domain/value-objects/password-policy'
import { toUserView, type UserView } from '../mappers/user-view'
import type { AuthTokenService, AuthTokens } from '../tokens/auth-token.service'
import type { RegisterCommand } from './register.command'

export interface RegisterServiceOptions {
  passwordMinLength: number
}

/** Caso de uso de cadastro: valida, cria o usuário e já emite os tokens (auto-login). */
export class RegisterService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AuthTokenService,
    private readonly opts: RegisterServiceOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: RegisterCommand): Promise<{ user: UserView; tokens: AuthTokens }> {
    const email = Email.create(command.email)
    assertPasswordPolicy(command.password, this.opts.passwordMinLength)

    const firstName = command.firstName.trim()
    const lastName = command.lastName.trim()
    if (!firstName || !lastName) throw new ValidationError('Nome e sobrenome são obrigatórios')

    // Fast-path: e-mail já cadastrado (a corrida é coberta pelo índice único em `create`).
    const existing = await this.users.findByEmail(email.value)
    if (existing) throw new EmailAlreadyInUseError()

    const passwordHash = await this.hasher.hash(command.password)
    const user = UserAggregate.register({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      firstName,
      lastName,
      phone: command.phone,
      signupSource: command.source,
      // Cadastro público: a senha é do próprio usuário → conta já "com senha definida".
      passwordSet: true,
    })

    await this.users.create(user)
    for (const event of user.pullEvents()) this.logger.info(event.eventName, event.toPayload())

    const tokens = await this.tokens.issueForUser(user, {
      userAgent: command.userAgent,
      ip: command.ip,
    })
    return { user: toUserView(user), tokens }
  }
}
