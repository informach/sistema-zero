export interface SendWhatsAppInput {
  /** Instância (número) na Evolution que deve enviar. */
  instanceName: string
  phoneNumber: string
  text: string
  /** Tempo de "digitando" (ms) antes de enviar — simula comportamento humano. */
  typingDelayMs?: number
}

export interface SendWhatsAppResult {
  providerMessageId: string | null
}

/**
 * Port (anti-corrupção) de envio de WhatsApp. O adapter (Evolution API) traduz
 * para `POST /message/sendText/{instance}`. Em falha lança `ProviderSendError`.
 */
export interface WhatsAppGateway {
  sendText(input: SendWhatsAppInput): Promise<SendWhatsAppResult>
}
