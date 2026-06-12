/**
 * Dedupe das entregas do payments (at-least-once). Padrão do funil: checa ANTES
 * de processar e marca SÓ DEPOIS do sucesso — falha transitória → 502 → o
 * payments re-entrega.
 */
export interface ProcessedWebhookStore {
  isProcessed(deliveryId: string): Promise<boolean>
  markProcessed(deliveryId: string, meta: { paymentId?: string; eventName?: string }): Promise<void>
  /** Retenção (cron): apaga marcas mais antigas que `days`. Retorna nº de linhas. */
  pruneOlderThan(days: number): Promise<number>
}
