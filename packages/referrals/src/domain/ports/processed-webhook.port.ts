/**
 * Dedupe das entregas do payments (cópia do padrão fiscal): a entrega é
 * RESERVADA numa transação curta (claim + lease + token) e só marcada
 * processada após sucesso — crash no meio expira o lease e a re-entrega
 * reprocessa; 502 na rota força a re-entrega at-least-once.
 */
export type WebhookClaim =
  | { kind: 'claimed'; token: string }
  | { kind: 'processed' }
  | { kind: 'in_progress' }

export interface ProcessedWebhookStore {
  claimDelivery(deliveryId: string, staleMs: number): Promise<WebhookClaim>
  markProcessed(
    deliveryId: string,
    claimToken: string,
    meta: { paymentId?: string; eventName?: string },
  ): Promise<boolean>
  releaseClaim(deliveryId: string, claimToken: string): Promise<void>
  /** Retenção (padrão fiscal): apaga entregas processadas antes do corte. */
  pruneProcessedBefore(cutoff: Date): Promise<number>
}
