import { type BillingPeriod, readBillingPeriod } from '@sistemazero/core/billing'
import { ValidationError } from '../shared/errors'

export interface SubscriptionRetryTerms {
  period: BillingPeriod
  nextExecution: string
}

export function readRetryTerms(value: SubscriptionRetryTerms): SubscriptionRetryTerms {
  const period = readBillingPeriod(value.period)
  const date = value.nextExecution
  const timestamp = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : new Date(Number.NaN)
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(timestamp.getTime()) ||
    timestamp.toISOString().slice(0, 10) !== date
  )
    throw new ValidationError('Próxima cobrança inválida')
  return { period, nextExecution: date }
}

export type SubscriptionOperationKind = 'CARD_UPDATE' | 'RETRY' | 'CANCEL'
export type SubscriptionOperationState =
  | 'READY'
  | 'EXECUTING'
  | 'UNKNOWN'
  | 'SUCCEEDED'
  | 'REJECTED'

/** Sem token, PAN, CVV ou payload do provedor. A intenção pertence à assinatura local. */
export interface SubscriptionOperation {
  id: string
  subscriptionId: string
  consumerId: string
  providerSubscriptionId: string
  kind: SubscriptionOperationKind
  state: SubscriptionOperationState
  providerPaymentId: string | null
  amountInCents: bigint | null
  retryTerms: SubscriptionRetryTerms | null
  currency: 'BRL'
  createdAt: Date
  expiresAt: Date
  startedAt: Date | null
  executionId: string | null
  executionAttempts: number
  completedAt: Date | null
  result: string | null
}

/** Débitos e trocas incertos não são reexecutados; cancelamento tem retomada própria e cercada. */
export function createSubscriptionOperation(input: {
  subscriptionId: string
  consumerId: string
  providerSubscriptionId: string
  kind: SubscriptionOperationKind
  providerPaymentId?: string
  amountInCents?: bigint
  retryTerms?: SubscriptionRetryTerms
  now: Date
}): SubscriptionOperation {
  if (
    !input.subscriptionId ||
    !input.consumerId ||
    !input.providerSubscriptionId ||
    !Number.isFinite(input.now.getTime())
  ) {
    throw new ValidationError('Intenção de assinatura incompleta')
  }
  if (
    input.kind === 'RETRY' &&
    (!input.providerPaymentId ||
      !input.amountInCents ||
      input.amountInCents < 1n ||
      !input.retryTerms)
  ) {
    throw new ValidationError('Regularização exige cobrança, valor e período confirmados')
  }
  if (
    input.kind !== 'RETRY' &&
    (input.providerPaymentId !== undefined ||
      input.amountInCents !== undefined ||
      input.retryTerms !== undefined)
  ) {
    throw new ValidationError('Operação sem débito não recebe cobrança ou valor')
  }
  return {
    id: crypto.randomUUID(),
    subscriptionId: input.subscriptionId,
    consumerId: input.consumerId,
    providerSubscriptionId: input.providerSubscriptionId,
    kind: input.kind,
    state: 'READY',
    providerPaymentId: input.providerPaymentId ?? null,
    amountInCents: input.amountInCents ?? null,
    retryTerms: input.retryTerms ? readRetryTerms(input.retryTerms) : null,
    currency: 'BRL',
    createdAt: new Date(input.now),
    expiresAt: new Date(input.now.getTime() + 10 * 60_000),
    startedAt: null,
    executionId: null,
    executionAttempts: 0,
    completedAt: null,
    result: null,
  }
}

export interface SubscriptionOperationRepository {
  /** Expira READY antigos; unique parcial impede operações simultâneas na mesma assinatura. */
  create(operation: SubscriptionOperation): Promise<boolean>
  findById(id: string): Promise<SubscriptionOperation | null>
  findActiveForSubscription(
    subscriptionId: string,
    now: Date,
  ): Promise<SubscriptionOperation | null>
  /** CAS único READY → EXECUTING, com prazo no banco. Nunca recupera EXECUTING para executar. */
  start(id: string, subscriptionId: string, now: Date): Promise<SubscriptionOperation | null>
  /** Retires only unstarted intents after the durable cancellation request. */
  rejectUnstartedForCancellation(subscriptionId: string, now: Date): Promise<void>
  /** Only READY cancellation, after the exact automatic request was withdrawn. */
  rejectWithdrawnCancellation(subscriptionId: string, caseId: string, now: Date): Promise<void>
  /** Only cancellation is safe to resume; never re-executes card updates or debits. */
  resumeCancellation(
    id: string,
    subscriptionId: string,
    now: Date,
    staleAfterMs: number,
  ): Promise<SubscriptionOperation | null>
  /** CAS do executor; UNKNOWN continua bloqueando nova cobrança até conciliação explícita. */
  finish(
    id: string,
    executionId: string,
    state: 'UNKNOWN' | 'SUCCEEDED' | 'REJECTED',
    result: string,
    now: Date,
  ): Promise<void>
}
