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
    /**
     * TTL desta emissão (min). Ausente → `opts.ttlMinutes` (reset comum, curto). O
     * convite/1º-acesso passam o TTL LONGO (`INVITE_TOKEN_TTL_MINUTES`) — o link
     * precisa sobreviver dias entre a compra e o 1º acesso.
     */
    ttlMinutes?: number
  }): Promise<IssuedPasswordToken | null> {
    const email = Email.create(command.email)
    const user = await this.users.findByEmail(email.value)
    if (!user?.isActive()) return null

    const now = command.now ?? new Date()
    const cooldownSeconds = command.cooldownSeconds ?? 0
    const ttlMinutes = command.ttlMinutes ?? this.opts.ttlMinutes
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000)
    const issued = await this.tokens.createReplacingActive(
      {
        id: randomUUID(),
        userId: user.id,
        tokenHash: sha256Hex(token),
        expiresAt,
      },
      now,
      cooldownSeconds,
    )
    // Cooldown por conta: emissão dentro da janela → null (o forgot-password
    // silencia — não consome o token vigente nem dispara outro e-mail).
    if (!issued) return null

    return { token, expiresAt, userId: user.id, firstName: user.firstName, email: user.email }
  }
}
