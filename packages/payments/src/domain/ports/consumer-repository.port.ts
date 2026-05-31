/**
 * Port (driven) com as credenciais dos sistemas consumidores autorizados a
 * chamar este serviço. Fonte do IP allowlist e dos segredos HMAC.
 */
export interface Consumer {
  id: string
  name: string
  /** Segredo usado para validar a assinatura HMAC das requisições do consumidor. */
  hmacSecret: string
  /** Faixas de IP (CIDR) ou IPs exatos autorizados. */
  allowedCidrs: string[]
  /** URL para receber webhooks de saída (notificação de pagamento). */
  webhookUrl?: string | null
  isActive: boolean
}

export interface ConsumerRepository {
  findById(consumerId: string): Promise<Consumer | null>
}
