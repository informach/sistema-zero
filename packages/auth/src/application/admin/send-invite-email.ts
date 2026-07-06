import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { MessagingClient } from '../../domain/ports/messaging-client.port'
import type { IssuedPasswordToken } from '../password-reset/create-password-token.service'

/**
 * Envia o e-mail `welcome` (convite/1º acesso) com o link de definição de senha —
 * BEST-EFFORT (falha só loga e devolve `false`, nunca propaga). Compartilhado pela
 * criação de usuário (`CreateUserService`) e pelo REENVIO (`ResendInviteService`)
 * para que o formato do link + a idempotência do envio fiquem num lugar só.
 */
export async function sendInviteEmail(
  messaging: MessagingClient,
  logger: Logger,
  input: { issued: IssuedPasswordToken; linkBase: string; userId: string },
): Promise<boolean> {
  try {
    const link = `${input.linkBase}/redefinir-senha?token=${input.issued.token}`
    await messaging.sendEmail({
      templateKey: 'welcome',
      recipient: { name: input.issued.firstName, email: input.issued.email },
      variables: { nome: input.issued.firstName, link },
      // Idempotência por token emitido (retries do mesmo convite não duplicam e-mail).
      idempotencyKey: `invite-${sha256Hex(input.issued.token).slice(0, 24)}`,
    })
    return true
  } catch (error) {
    logger.error('admin.user.invite_failed', {
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}
