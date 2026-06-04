import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { MessagingClient } from '../../domain/ports/messaging-client.port'
import type { CreatePasswordTokenService } from './create-password-token.service'

export interface ForgotPasswordOptions {
  /** Base do link de redefinição (app community): `${communityUrl}/redefinir-senha?token=...`. */
  communityUrl: string
}

/**
 * "Esqueci minha senha": SEMPRE conclui em sucesso (anti-enumeração — não revela
 * se o e-mail existe). Quando a conta existe e está ativa, emite o token e envia
 * o e-mail `password-reset` via messaging — BEST-EFFORT (falha de envio é logada,
 * nunca propaga; o usuário pode simplesmente tentar de novo).
 */
export class ForgotPasswordService {
  constructor(
    private readonly createToken: CreatePasswordTokenService,
    private readonly messaging: MessagingClient,
    private readonly opts: ForgotPasswordOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: { email: string }): Promise<void> {
    let issued: Awaited<ReturnType<CreatePasswordTokenService['execute']>> = null
    try {
      issued = await this.createToken.execute({ email: command.email })
    } catch {
      // E-mail malformado etc. — silencia (mesma resposta de sucesso, anti-enumeração).
      return
    }
    if (!issued) return

    const link = `${this.opts.communityUrl}/redefinir-senha?token=${issued.token}`
    try {
      await this.messaging.sendEmail({
        templateKey: 'password-reset',
        recipient: { name: issued.firstName, email: issued.email },
        variables: { nome: issued.firstName, link },
        // Idempotência por token emitido (re-tentativas do mesmo pedido não duplicam).
        idempotencyKey: `pwreset-${sha256Hex(issued.token).slice(0, 24)}`,
      })
    } catch (error) {
      this.logger.error('forgot_password.email_failed', {
        userId: issued.userId,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
