/** Contratos de cartão compartilhados entre BFF e formulário, sem importar o player. */
export interface SubscriptionCardIntentView {
  id: string
  subscriptionId: string
  state: 'READY' | 'EXECUTING' | 'UNKNOWN' | 'SUCCEEDED' | 'REJECTED'
  expiresAt: string
  chargesNow: false
  result: string | null
}

export interface SubscriptionCardConfigView {
  available: boolean
  accountIdentifier: string | null
  environment: 'sandbox' | 'production'
}

export interface SubscriptionCardContextView {
  intent: SubscriptionCardIntentView | null
  canUpdate: boolean
}

export interface SubscriptionRetryIntentView {
  id: string
  subscriptionId: string
  state: SubscriptionCardIntentView['state']
  expiresAt: string
  chargesNow: true
  amountInCents: string
  currency: 'BRL'
  terms: { period: { startsAt: string; endsAt: string }; nextExecution: string }
  result: string | null
}
export interface SubscriptionRetryContextView {
  intent: SubscriptionRetryIntentView | null
  canRegularize: boolean
}
