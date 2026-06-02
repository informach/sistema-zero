/**
 * Deduplicação de webhooks de entrada (entrega ≥1 vez). Espelha o padrão do funil:
 * checa ANTES de processar, mas só registra DEPOIS do sucesso — assim uma falha
 * transitória mantém o evento retryável.
 */
export interface ProcessedWebhookRepository {
  isProcessed(deliveryId: string): Promise<boolean>
  markProcessed(deliveryId: string, eventName: string): Promise<void>
}
