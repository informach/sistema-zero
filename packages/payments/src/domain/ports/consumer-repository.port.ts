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
  /**
   * Eventos aos quais este consumer está INSCRITO além dos seus próprios
   * pagamentos (fan-out). O dono do pagamento recebe os eventos dele sem
   * precisar de inscrição; um subscriber (ex.: fiscal) recebe TODOS os eventos
   * do nome inscrito, de qualquer dono. Ausente/vazio = sem fan-out.
   */
  subscribedEvents?: string[]
  isActive: boolean
}

export interface ConsumerRepository {
  findById(consumerId: string): Promise<Consumer | null>
  /** Consumers ativos, com webhookUrl, inscritos no evento (p/ fan-out). */
  findSubscribers(eventName: string): Promise<Consumer[]>
}
