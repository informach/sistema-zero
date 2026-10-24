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
