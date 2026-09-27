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

export const FIXED_ACCESS_LIFECYCLE_KINDS = ['expiry_7d', 'expiry_3d', 'expired'] as const
export type FixedAccessLifecycleKind = (typeof FIXED_ACCESS_LIFECYCLE_KINDS)[number]

/**
 * Compra única do Desafio com prazo em DIAS. O `messageKind` já vem resolvido
 * pelo repositório para a faixa vigente e ainda não enviada.
 */
export interface FixedAccessLifecycleEntitlement extends ExpiringTermEntitlement {
  courseRef: string
  messageKind: FixedAccessLifecycleKind
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

  /**
   * Acessos `fixed/days` do Desafio que entraram na faixa de 7 dias, 3 dias ou
   * expiração. Exclui quem possui outra matrícula mais forte para o curso.
   */
  listFixedAccessLifecycleEntitlements(
    now: Date,
    limit: number,
  ): Promise<FixedAccessLifecycleEntitlement[]>
  /** Dedupe por matrícula + vencimento + tipo de mensagem. */
  markLifecycleMessageSent(
    entitlementId: string,
    expiresOn: string,
    messageKind: FixedAccessLifecycleKind,
    now: Date,
  ): Promise<void>
}

/** Data (UTC `YYYY-MM-DD`) usada como chave de dedupe do lembrete. */
export function expiresOnKey(expiresAt: Date): string {
  return expiresAt.toISOString().slice(0, 10)
}
