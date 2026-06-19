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
  /** Mínimo de segundos entre emissões por (usuário, finalidade). 0 desliga. */
  cooldownSeconds: number
}

/**
 * Emite um código OTP (6 dígitos) por e-mail. SEMPRE conclui em sucesso
 * (anti-enumeração — a rota responde 200 exista a conta ou não). Conta
 * inexistente/inativa → no-op silencioso. Um código ativo por (usuário, finalidade):
 * emitir um novo consome os pendentes — por isso o COOLDOWN por conta (o rate
 * limit do gateway é por IP; IPs distribuídos poderiam bombardear o inbox de uma
 * vítima E invalidar o código legítimo a cada pedido). Envio best-effort (falha
 * só loga; o usuário pode re-pedir). O código CRU só trafega para o messaging —
 * nunca é persistido (nem em forma derivável: a idempotencyKey vem do uuid do
 * registro, NUNCA do código — sha256 de 6 dígitos é reversível por força bruta).
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
    const code = generateOtpCode()
    const recordId = randomUUID()
    const expiresAt = new Date(now.getTime() + this.opts.ttlMinutes * 60_000)
    const issued = await this.otpCodes.createReplacingActive(
      {
        id: recordId,
        userId: user.id,
        purpose: command.purpose,
        codeHash: sha256Hex(code),
        expiresAt,
      },
      now,
      this.opts.cooldownSeconds,
    )
    // Cooldown por conta: pedido dentro da janela → no-op silencioso (mesma
    // resposta 200; não consome o código vigente nem envia outro e-mail).
    if (!issued) return

    try {
      await this.messaging.sendEmail({
        templateKey: 'otp',
        recipient: { name: user.firstName, email: user.email },
        variables: { nome: user.firstName, codigo: code },
        // Idempotência pelo uuid do REGISTRO (re-tentativas do mesmo envio não
        // duplicam). NUNCA derive do código: sha256 de um espaço de 10^6 é
        // enumerável offline — a chave persistida no messaging viraria o código.
        idempotencyKey: `otp-${recordId}`,
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
