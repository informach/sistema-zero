/**
 * Dedupe das entregas do payments (at-least-once). Padrão do funil: checa ANTES
 * de processar e marca SÓ DEPOIS do sucesso — falha transitória → 502 → o
 * payments re-entrega.
 */
export type WebhookClaim =
  | { kind: 'claimed'; token: string }
  | { kind: 'processed' }
  | { kind: 'in_progress' }

export interface ProcessedWebhookStore {
  /** Reserva uma entrega sem manter transação/conexão durante chamadas remotas. */
  claimDelivery(deliveryId: string, staleMs: number): Promise<WebhookClaim>
  markProcessed(
    deliveryId: string,
    claimToken: string,
    meta: { paymentId?: string; eventName?: string },
  ): Promise<boolean>
  /** Libera a reserva após falha retentável para a próxima entrega. */
  releaseClaim(deliveryId: string, claimToken: string): Promise<void>
  /** Retenção (cron): apaga marcas mais antigas que `days`. Retorna nº de linhas. */
  pruneOlderThan(days: number): Promise<number>
}
