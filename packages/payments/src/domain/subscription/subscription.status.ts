/**
 * Estados de uma assinatura (recorrência gerenciada pela Efí) e as transições
 * permitidas. Diferente do pagamento avulso, a recorrência é dirigida pela Efí:
 * nós sincronizamos o estado a partir das notificações (ativação na 1ª cobrança
 * paga, cancelamento, expiração ao fim dos ciclos).
 *
 * PENDING ──▶ ACTIVE ──▶ CANCELED | EXPIRED
 * PENDING ──▶ CANCELED | EXPIRED   (cancelada/expirada antes de ativar)
 */
export const SubscriptionStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

const TRANSITIONS: Readonly<Record<SubscriptionStatus, readonly SubscriptionStatus[]>> = {
  PENDING: ['ACTIVE', 'CANCELED', 'EXPIRED'],
  ACTIVE: ['CANCELED', 'EXPIRED'],
  CANCELED: [],
  EXPIRED: [],
}

export const TERMINAL_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = ['CANCELED', 'EXPIRED']

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function isTerminal(status: SubscriptionStatus): boolean {
  return TERMINAL_SUBSCRIPTION_STATUSES.includes(status)
}
