/** Pedido de envio de e-mail transacional (template renderizado pelo messaging). */
export interface SendEmailInput {
  templateKey: string
  recipient: { name: string; email: string }
  variables: Record<string, string>
  /** Idempotência no messaging (por consumidor + chave) — absorve retry pós-crash. */
  idempotencyKey: string
}

/**
 * Porta de saída para a mensageria (@sistemazero/messaging, VIA GATEWAY — o
 * members é consumer HMAC `members`; NUNCA falar com o messaging direto: o
 * `x-consumer-id` confiável só o gateway injeta). Erro → lança (o job trata).
 */
export interface MessagingGateway {
  sendEmail(input: SendEmailInput): Promise<void>
}
