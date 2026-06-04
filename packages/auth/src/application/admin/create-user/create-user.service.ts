import { randomBytes, randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { MessagingClient } from '../../../domain/ports/messaging-client.port'
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port'
import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { UserAggregate } from '../../../domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../../domain/user/user.errors'
import type { UserRole } from '../../../domain/user/user.role'
import { Email } from '../../../domain/value-objects/email'
import { type AdminUserView, toAdminUserView } from '../../mappers/admin-user-view'
import type { CreatePasswordTokenService } from '../../password-reset/create-password-token.service'
import type { CreateUserActor, CreateUserCommand } from './create-user.command'

/** Papéis privilegiados que só `superadmin` pode conceder (espelha o update-user). */
const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'superadmin'])

export interface CreateUserOptions {
  /** Base do link de definição de senha: `${communityUrl}/redefinir-senha?token=...`. */
  communityUrl: string
}

export interface CreateUserResult {
  user: AdminUserView
  /** `false` quando o e-mail de convite falhou (criação NÃO é desfeita — best-effort). */
  inviteSent: boolean
}

/**
 * Criação de usuário pelo painel admin (fluxo CONVITE): cria a conta `active` com
 * uma senha ALEATÓRIA forte (hash de 32 bytes — impossível de adivinhar; a conta
 * só vira utilizável quando o convidado define a própria senha pelo link), emite o
 * token single-use de definição de senha e envia o e-mail `welcome` (mesmo template
 * do 1º acesso pós-compra) — envio BEST-EFFORT (falha não desfaz a criação;
 * `inviteSent: false` sinaliza ao painel). Guards hierárquicos como no update-user:
 * `admin` só cria staff/customer; `superadmin` cria qualquer papel.
 */
export class CreateUserService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly createPasswordToken: CreatePasswordTokenService,
    private readonly messaging: MessagingClient,
    private readonly opts: CreateUserOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResult> {
    this.authorize(command.actor, command.role)

    const email = Email.create(command.email)
    const firstName = command.firstName.trim()
    const lastName = command.lastName.trim()
    if (!firstName || !lastName) throw new ValidationError('Nome e sobrenome são obrigatórios')

    // Fast-path: e-mail em uso → 409 (o índice único cobre a corrida no create).
    const existing = await this.users.findByEmail(email.value)
    if (existing) throw new EmailAlreadyInUseError()

    // Senha aleatória de 32 bytes: nunca exibida/entregue — a real vem pelo convite.
    const passwordHash = await this.hasher.hash(randomBytes(32).toString('base64url'))
    const user = UserAggregate.register({
      id: randomUUID(),
      email,
      passwordHash,
      firstName,
      lastName,
      phone: command.phone,
      role: command.role,
      // `active` é OBRIGATÓRIO: o token de senha só é emitido p/ conta ativa
      // (create-password-token exige `isActive()`); a senha aleatória impede login.
      status: 'active',
      signupSource: 'admin',
    })
    await this.users.create(user)
    for (const event of user.pullEvents()) this.logger.info(event.eventName, event.toPayload())

    const inviteSent = await this.sendInvite(user.email, user.id)
    this.logger.info('admin.user.created', {
      userId: user.id,
      role: user.role,
      by: command.actor.id,
      inviteSent,
    })
    return { user: toAdminUserView(user), inviteSent }
  }

  /** Convite (token + e-mail `welcome`) — best-effort, nunca desfaz a criação. */
  private async sendInvite(email: string, userId: string): Promise<boolean> {
    try {
      const issued = await this.createPasswordToken.execute({ email })
      if (!issued) return false
      const link = `${this.opts.communityUrl}/redefinir-senha?token=${issued.token}`
      await this.messaging.sendEmail({
        templateKey: 'welcome',
        recipient: { name: issued.firstName, email: issued.email },
        variables: { nome: issued.firstName, link },
        // Idempotência por token emitido (retries do mesmo convite não duplicam).
        idempotencyKey: `invite-${sha256Hex(issued.token).slice(0, 24)}`,
      })
      return true
    } catch (error) {
      this.logger.error('admin.user.invite_failed', {
        userId,
        message: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  /** Guards hierárquicos (defesa em profundidade — o gateway já barrou não-admins). */
  private authorize(actor: CreateUserActor, role: UserRole): void {
    if (actor.role !== 'superadmin' && actor.role !== 'admin') {
      throw new ForbiddenError('Sem permissão para criar usuários')
    }
    if (actor.role !== 'superadmin' && PRIVILEGED_ROLES.has(role)) {
      throw new ForbiddenError('Apenas superadmin pode criar contas admin/superadmin')
    }
  }
}
