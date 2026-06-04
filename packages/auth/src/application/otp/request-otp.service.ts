import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { MessagingClient } from '../../domain/ports/messaging-client.port'
import type { OtpCodeRepository, OtpPurpose } from '../../domain/ports/otp-code-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { Email } from '../../domain/value-objects/email'
import { generateOtpCode } from './otp-code'

export interface RequestOtpOptions {
  ttlMinutes: number
}

/**
 * Emite um código OTP (6 dígitos) por e-mail. SEMPRE conclui em sucesso
 * (anti-enumeração — a rota responde 200 exista a conta ou não). Conta
 * inexistente/inativa → no-op silencioso. Um código ativo por (usuário, finalidade):
 * emitir um novo consome os pendentes. Envio best-effort (falha só loga; o usuário
 * pode re-pedir). O código CRU só trafega para o messaging — nunca é persistido.
 */
export class RequestOtpService {
  constructor(
    private readonly users: UserRepository,
    private readonly otpCodes: OtpCodeRepository,
    private readonly messaging: MessagingClient,
    private readonly opts: RequestOtpOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: { email: string; purpose: OtpPurpose }): Promise<void> {
    let email: Email
    try {
      email = Email.create(command.email)
    } catch {
      return // e-mail malformado → silencia (mesma resposta de sucesso, anti-enumeração)
    }
    const user = await this.users.findByEmail(email.value)
    if (!user?.isActive()) return

    const now = new Date()
    await this.otpCodes.consumeAllForUser(user.id, command.purpose, now)

    const code = generateOtpCode()
    const expiresAt = new Date(now.getTime() + this.opts.ttlMinutes * 60_000)
    await this.otpCodes.create({
      id: randomUUID(),
      userId: user.id,
      purpose: command.purpose,
      codeHash: sha256Hex(code),
      expiresAt,
    })

    try {
      await this.messaging.sendEmail({
        templateKey: 'otp',
        recipient: { name: user.firstName, email: user.email },
        variables: { nome: user.firstName, codigo: code },
        // Idempotência por código emitido (re-tentativas do mesmo envio não duplicam).
        idempotencyKey: `otp-${sha256Hex(code).slice(0, 24)}`,
      })
    } catch (error) {
      this.logger.error('otp.email_failed', {
        userId: user.id,
        purpose: command.purpose,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
