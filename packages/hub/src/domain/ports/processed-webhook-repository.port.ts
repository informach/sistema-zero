/**
 * Dedupe de webhooks de entrada (entrega ≥1 vez). A retenção (poda dos antigos)
 * roda no composition-root via SQL direto — aqui só o caminho quente.
 */
export interface ProcessedWebhookRepository {
  isProcessed(deliveryId: string): Promise<boolean>
  markProcessed(deliveryId: string, eventName: string): Promise<void>
}
