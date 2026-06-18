import { randomBytes, randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import type { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { Email } from '../../domain/value-objects/email'

export interface CreatePasswordTokenOptions {
  ttlMinutes: number
}

/** Token emitido (valor CRU — entregue só por canal seguro: e-mail ou S2S). */
export interface IssuedPasswordToken {
  token: string
  expiresAt: Date
  userId: string
  firstName: string
  email: string
}

/**
 * Emite um token de definição/redefinição de senha para um usuário ATIVO.
 * Retorna `null` quando o e-mail não existe ou a conta não está ativa (o chamador
 * decide o que fazer — o forgot-password silencia, o endpoint interno responde 404).
 * Emitir um novo token consome os pendentes (1 token vivo por usuário).
 * `cooldownSeconds` (OPT-IN, só o forgot-password público) impõe um mínimo entre
 * emissões por conta — os fluxos S2S/convite chamam SEM cooldown (o funil precisa
 * do token na hora do fulfillment).
 */
export class CreatePasswordTokenService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly opts: CreatePasswordTokenOptions,
  ) {}

  async execute(command: {
    email: string
    now?: Date
    cooldownSeconds?: number
  }): Promise<IssuedPasswordToken | null> {
    const email = Email.create(command.email)
    const user = await this.users.findByEmail(email.value)
    if (!user?.isActive()) return null

    const now = command.now ?? new Date()
    // Cooldown por conta: emissão dentro da janela → null (o forgot-password
    // silencia — não consome o token vigente nem dispara outro e-mail).
    const cooldownSeconds = command.cooldownSeconds ?? 0
    if (cooldownSeconds > 0) {
      const last = await this.tokens.lastIssuedAt(user.id)
      if (last && now.getTime() - last.getTime() < cooldownSeconds * 1000) return null
    }
    await this.tokens.consumeAllForUser(user.id, now)

    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(now.getTime() + this.opts.ttlMinutes * 60_000)
    await this.tokens.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: sha256Hex(token),
      expiresAt,
    })

    return { token, expiresAt, userId: user.id, firstName: user.firstName, email: user.email }
  }
}
