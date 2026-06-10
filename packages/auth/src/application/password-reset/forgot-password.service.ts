import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { MessagingClient } from '../../domain/ports/messaging-client.port'
import { type Platform, type PlatformUrls, resolvePlatformUrl } from '../platform'
import type { CreatePasswordTokenService } from './create-password-token.service'

export interface ForgotPasswordOptions {
  /** Bases dos links de redefinição por plataforma: `${base}/redefinir-senha?token=...`. */
  urls: PlatformUrls
  /**
   * Mínimo de segundos entre emissões por conta (anti spam de inbox/invalidação
   * do token legítimo por IPs distribuídos — o limit do gateway é por IP). 0 desliga.
   */
  cooldownSeconds: number
}

/**
 * "Esqueci minha senha": SEMPRE conclui em sucesso (anti-enumeração — não revela
 * se o e-mail existe). Quando a conta existe e está ativa, emite o token e envia
 * o e-mail `password-reset` via messaging — BEST-EFFORT (falha de envio é logada,
 * nunca propaga; o usuário pode simplesmente tentar de novo). `platform` decide a
 * base do link (community vs kids) — o BFF de cada app informa a sua.
 */
export class ForgotPasswordService {
  constructor(
    private readonly createToken: CreatePasswordTokenService,
    private readonly messaging: MessagingClient,
    private readonly opts: ForgotPasswordOptions,
    private readonly logger: Logger,
  ) {}

  async execute(command: { email: string; platform?: Platform }): Promise<void> {
    // ANTES do silêncio anti-enumeração: plataforma kids sem env configurada é
    // erro de CONFIGURAÇÃO (400 visível) — não pode virar 200 sem e-mail. Não
    // vaza existência de conta (falha antes de olhar o e-mail).
    const base = resolvePlatformUrl(this.opts.urls, command.platform)

    let issued: Awaited<ReturnType<CreatePasswordTokenService['execute']>> = null
    try {
      issued = await this.createToken.execute({
        email: command.email,
        cooldownSeconds: this.opts.cooldownSeconds,
      })
    } catch {
      // E-mail malformado etc. — silencia (mesma resposta de sucesso, anti-enumeração).
      return
    }
    if (!issued) return

    const link = `${base}/redefinir-senha?token=${issued.token}`
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
