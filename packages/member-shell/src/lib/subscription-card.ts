/** Contratos financeiros compartilhados entre BFF e formulário, sem importar o player. */
export interface MySubscriptionView {
  id: string
  status: string
  /** Mensal = 1, anual = 12. */
  intervalMonths: number
  repeats: number | null
  /** Centavos serializados como STRING (bigint) → use `formatCentsStr`. */
  amountInCents: string
  currency: string
  card: { brand: string; last4: string }
  cyclesCompleted: number
  lastChargeAt: string | null
  description: string | null
  cancelRequestedAt?: string | null
  canceledAt: string | null
  createdAt: string
  pendingOperation: PendingSubscriptionOperationView | null
}

export interface PendingSubscriptionOperationView {
  kind: 'CARD_UPDATE' | 'RETRY' | 'CANCEL'
  state: 'READY' | 'EXECUTING' | 'UNKNOWN'
}

export function pendingSubscriptionMessage(operation: PendingSubscriptionOperationView): string {
  if (operation.kind === 'CANCEL')
    return 'O cancelamento está em conferência. O período já pago continua preservado.'
  if (operation.state === 'READY')
    return operation.kind === 'RETRY'
      ? 'Há uma regularização iniciada. Confira a cobrança no histórico para continuar; nenhum novo pagamento foi confirmado.'
      : 'Há uma alteração de cartão iniciada. Abra Alterar cartão para continuar.'
  return operation.kind === 'RETRY'
    ? 'O resultado do pagamento está em conferência. Não repita a cobrança. Atualize a lista para acompanhar ou entre em contato com o atendimento.'
    : 'O resultado da alteração de cartão está em conferência. Não envie o cartão novamente. Atualize a lista para acompanhar ou entre em contato com o atendimento.'
}

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
  blockedBy: PendingSubscriptionOperationView | null
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
  blockedBy: PendingSubscriptionOperationView | null
}
