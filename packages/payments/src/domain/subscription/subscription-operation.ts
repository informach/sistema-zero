import { ValidationError } from '../shared/errors'

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
  currency: 'BRL'
  createdAt: Date
  expiresAt: Date
  startedAt: Date | null
  completedAt: Date | null
  result: string | null
}

/** Não há retry automático de EXECUTING: efeito externo pode já ter acontecido. */
export function createSubscriptionOperation(input: {
  subscriptionId: string
  consumerId: string
  providerSubscriptionId: string
  kind: SubscriptionOperationKind
  providerPaymentId?: string
  amountInCents?: bigint
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
    (!input.providerPaymentId || !input.amountInCents || input.amountInCents < 1n)
  ) {
    throw new ValidationError('Regularização exige cobrança e valor confirmados')
  }
  if (
    input.kind !== 'RETRY' &&
    (input.providerPaymentId !== undefined || input.amountInCents !== undefined)
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
    currency: 'BRL',
    createdAt: new Date(input.now),
    expiresAt: new Date(input.now.getTime() + 10 * 60_000),
    startedAt: null,
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
  /** CAS do executor; UNKNOWN continua bloqueando nova cobrança até conciliação explícita. */
  finish(
    id: string,
    state: 'UNKNOWN' | 'SUCCEEDED' | 'REJECTED',
    result: string,
    now: Date,
  ): Promise<void>
}
