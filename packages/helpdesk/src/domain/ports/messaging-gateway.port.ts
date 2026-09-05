/** Entrada de `POST /messaging/send` (canal e-mail). `variables` é string→string. */
export interface SendEmailInput {
  templateKey: string
  recipient: { name: string; email: string }
  variables: Record<string, string>
  /** Vai no header `idempotency-key` e entra na mensagem canônica do HMAC (≤200 chars). */
  idempotencyKey: string
}

/**
 * Envio de e-mail pelo messaging, SEMPRE via api-gateway (consumer HMAC de borda
 * `helpdesk`): só o gateway injeta um `x-consumer-id` confiável e o
 * `x-internal-token` do messaging — o helpdesk nunca fala com o messaging direto.
 * Lança em falha; quem chama decide se o envio é best-effort.
 */
export interface MessagingGateway {
  sendEmail(input: SendEmailInput): Promise<void>
}
