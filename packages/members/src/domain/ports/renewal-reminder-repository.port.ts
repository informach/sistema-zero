/**
 * Matrícula POR PERÍODO (anual à vista — `sourceKind: 'payment'` + validade, SEM
 * assinatura) prestes a vencer. `offerSlug`/`name` vêm do snapshot congelado —
 * montam o link `/renovar?oferta=` e o nome do produto no e-mail.
 */
export interface ExpiringTermEntitlement {
  id: string
  userId: string
  expiresAt: Date
  offerSlug: string | null
  productName: string | null
}

/**
 * Porta do LEMBRETE de renovação (anual à vista). Assinaturas recorrentes ficam
 * FORA (a Efí renova sozinha; falha de ciclo tem o dunning do funil).
 */
export interface RenewalReminderRepository {
  /**
   * Matrículas ATIVAS de compra por período (payment + expiresAt, sem
   * subscriptionId) vencendo em `[from, to]`, sem lembrete registrado p/ a
   * data de vencimento corrente. `limit` conta grupos de compra
   * (usuário+oferta+data), portanto nunca divide as matrículas de uma compra
   * entre ciclos. Ordenadas pelo vencimento.
   */
  listExpiringTermEntitlements(
    from: Date,
    to: Date,
    limit: number,
  ): Promise<ExpiringTermEntitlement[]>
  /** Marca o lembrete enviado (dedupe por matrícula + data de vencimento). */
  markReminded(entitlementId: string, expiresOn: string, now: Date): Promise<void>
}

/** Data (UTC `YYYY-MM-DD`) usada como chave de dedupe do lembrete. */
export function expiresOnKey(expiresAt: Date): string {
  return expiresAt.toISOString().slice(0, 10)
}
