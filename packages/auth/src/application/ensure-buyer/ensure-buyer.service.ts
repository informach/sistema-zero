import { ValidationError } from '@sistemazero/core/errors'
import type { Logger } from '@sistemazero/core/logging'
import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { UserAggregate } from '../../domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../domain/user/user.errors'
import { Email } from '../../domain/value-objects/email'
import { assertPasswordPolicy } from '../../domain/value-objects/password-policy'
import type { EnsureBuyerCommand } from './ensure-buyer.command'

export interface EnsureBuyerServiceOptions {
  passwordMinLength: number
}

/** `created` distingue o comprador NOVO (manda o e-mail de boas-vindas) do RECORRENTE. */
export interface EnsureBuyerResult {
  userId: string
  created: boolean
}

/**
 * Garante que existe um usuário para o e-mail do comprador, retornando o `userId`
 * (novo ou existente). Idempotente: e-mail já cadastrado → devolve o id existente
 * (`created: false`), sem tocar na senha/perfil. É o que destrava o COMPRADOR
 * RECORRENTE (que antes recebia 409 no `register` e ficava sem acesso). NÃO emite
 * tokens (é S2S, sem sessão). A senha do `command` só vale no caminho de criação
 * (dummy; a real é definida depois pelo magic-link de 1º acesso).
 */
export class EnsureBuyerService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly opts: EnsureBuyerServiceOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: EnsureBuyerCommand): Promise<EnsureBuyerResult> {
    const email = Email.create(command.email)

    const existing = await this.users.findByEmail(email.value)
    if (existing) return { userId: existing.id, created: false }

    assertPasswordPolicy(command.password, this.opts.passwordMinLength)
    const firstName = command.firstName.trim()
    const lastName = command.lastName.trim()
    if (!firstName || !lastName) throw new ValidationError('Nome e sobrenome são obrigatórios')

    const passwordHash = await this.hasher.hash(command.password)
    const user = UserAggregate.register({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      firstName,
      lastName,
      phone: command.phone,
      signupSource: command.source,
    })

    try {
      await this.users.create(user)
    } catch (error) {
      // Corrida: outro fluxo criou o mesmo e-mail entre o findByEmail e o create.
      // O índice único do auth garante unicidade → reaproveita o usuário existente.
      if (error instanceof EmailAlreadyInUseError) {
        const raced = await this.users.findByEmail(email.value)
        if (raced) return { userId: raced.id, created: false }
      }
      throw error
    }

    for (const event of user.pullEvents()) this.logger.info(event.eventName, event.toPayload())
    return { userId: user.id, created: true }
  }
}
