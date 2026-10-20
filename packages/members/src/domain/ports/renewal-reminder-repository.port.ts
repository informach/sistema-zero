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

/**
 * Fim do acesso (20/10/2026). O presente de 7 dias (resgate `scholarship:`) avisa dois dias antes
 * e no dia em que termina; a assinatura da Comunidade avisa no dia em que o acesso venceu.
 * Todos usam o mesmo dedupe `entitlement_lifecycle_messages_sent` (matrícula + data + tipo).
 */
export const GIFT_LIFECYCLE_KINDS = ['gift_expiry_2d', 'gift_expired'] as const
export type GiftLifecycleKind = (typeof GIFT_LIFECYCLE_KINDS)[number]
export const SUBSCRIPTION_ENDED_KIND = 'subscription_ended' as const
export type AccessEndedKind = GiftLifecycleKind | typeof SUBSCRIPTION_ENDED_KIND

/** Ofertas da assinatura da Comunidade por audiência (snapshot `offerSlug`, igual ao catálogo). */
export const COMMUNITY_SUBSCRIPTION_OFFER_SLUGS = {
  kids: ['comunidade-dos-criadores-mensal', 'comunidade-dos-criadores-anual'],
  adult: ['comunidade-dos-criadores-adulto-mensal', 'comunidade-dos-criadores-adulto-anual'],
} as const satisfies Record<'kids' | 'adult', readonly string[]>

/** Uma linha de um presente (o curso e o Mural temporário do mesmo resgate vêm juntos). */
export interface GiftLifecycleEntitlement {
  id: string
  userId: string
  /** `scholarship:<id>`: o resgate; agrupa as matrículas do mesmo presente. */
  sourceId: string
  expiresAt: Date
  messageKind: GiftLifecycleKind
}

/** Uma matrícula de assinatura da Comunidade que acabou de vencer. */
export interface EndedSubscriptionEntitlement {
  id: string
  userId: string
  subscriptionId: string
  audience: 'kids' | 'adult'
  /** Data-chave do dedupe (`expires_at`, ou o momento em que venceu quando não há validade). */
  endedAt: Date
}

export interface AccessEndedMessagesRepository {
  /**
   * Presentes de 7 dias com aviso devido e ainda não enviado: `gift_expiry_2d` quando faltam
   * até 2 dias no calendário de São Paulo e a matrícula segue `active` (revogada ou vencida
   * antes da hora não recebe "vai terminar"); `gift_expired` quando venceu há no máximo `window`
   * ms (nunca avisa presentes antigos). Pula quem tem acesso mais forte e duradouro.
   */
  listGiftLifecycleEntitlements(
    now: Date,
    windowMs: number,
    limit: number,
  ): Promise<GiftLifecycleEntitlement[]>
  /**
   * Matrículas de assinatura da Comunidade que viraram `expired` nos últimos `windowMs` ms,
   * sem aviso registrado, de contas SEM outro acesso ativo à Comunidade da mesma audiência.
   * `limit` conta grupos (conta + assinatura), nunca divide um combo entre ciclos.
   */
  listEndedCommunitySubscriptions(
    now: Date,
    windowMs: number,
    limit: number,
  ): Promise<EndedSubscriptionEntitlement[]>
  markAccessEndedMessageSent(
    entitlementId: string,
    expiresOn: string,
    messageKind: AccessEndedKind,
    now: Date,
  ): Promise<void>
}
