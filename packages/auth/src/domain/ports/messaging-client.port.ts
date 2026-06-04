/** Pedido de envio de e-mail transacional (template renderizado pelo messaging). */
export interface SendEmailInput {
  templateKey: string
  recipient: { name: string; email: string }
  variables: Record<string, string>
  /** Idempotência no messaging (por consumidor + chave). */
  idempotencyKey: string
}

/**
 * Porta de saída para a mensageria (@sistemazero/messaging, via gateway). O envio
 * é BEST-EFFORT nos fluxos de senha: falha é logada, nunca propaga ao usuário.
 */
export interface MessagingClient {
  sendEmail(input: SendEmailInput): Promise<void>
}
