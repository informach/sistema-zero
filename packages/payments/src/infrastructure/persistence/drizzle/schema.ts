import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type {
  BoletoDetails,
  BoletoRequest,
  PixQrCode,
} from '../../../domain/payment/payment.aggregate'
import type { PaymentStatus } from '../../../domain/payment/payment.status'
import type { RecoveryReason } from '../../../domain/subscription-recovery/recovery-case'
import type {
  RecoveryMessageReceipt,
  RecoveryMessageRequest,
} from '../../../domain/subscription-recovery/recovery-messaging.port'
import type { RecoveryNoticePurpose } from '../../../domain/subscription-recovery/recovery-notice.port'
import type { RecoveryPolicy } from '../../../domain/subscription-recovery/recovery-policy'
import type { Address } from '../../../domain/value-objects/customer'
import type { CardData } from '../../../domain/value-objects/payment-method'

// Este package compartilha o Postgres `sistemazero` do monorepo, mas é dono do
// schema `payments` (isolamento por `pgSchema`). Todo o DDL gerado fica em `payments.*`.
// (`paymentsSchema` p/ não colidir com a tabela `payments` abaixo.)
export const paymentsSchema = pgSchema('payments')

// View de cliente persistida (sem dados sensíveis de cartão).
export interface CustomerJson {
  name: string
  email: string
  document: string
  phone?: string
  address?: Address
}

export const paymentStatusEnum = paymentsSchema.enum('payment_status', [
  'PENDING',
  // ⚠️ LEGADO: nenhum writer emite AUTHORIZED (o one-step da Efí não tem etapa
  // de pré-autorização) e o domínio não conhece mais esse estado. Mantido no
  // enum do Postgres só porque remover valor de enum exige recriar o tipo —
  // sem valor prático. NÃO reutilize.
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
])

/**
 * Narrowing do enum do BANCO (que mantém o `AUTHORIZED` legado) para o status
 * de domínio. Nenhum writer jamais gravou `AUTHORIZED`; encontrá-lo numa linha
 * é corrupção de dados → falha alto em vez de mascarar.
 */
export function toDomainPaymentStatus(
  value: (typeof paymentStatusEnum.enumValues)[number],
): PaymentStatus {
  if (value === 'AUTHORIZED') {
    throw new Error('payment_status legado AUTHORIZED encontrado no banco — não suportado')
  }
  return value
}

export const paymentMethodEnum = paymentsSchema.enum('payment_method', [
  'PIX',
  'BOLETO',
  'CREDIT_CARD',
])
export const subscriptionStatusEnum = paymentsSchema.enum('subscription_status', [
  'PENDING',
  'ACTIVE',
  'CANCELED',
  'EXPIRED',
])
export const subscriptionOperationKindEnum = paymentsSchema.enum('subscription_operation_kind', [
  'CARD_UPDATE',
  'RETRY',
  'CANCEL',
])
export const subscriptionOperationStateEnum = paymentsSchema.enum('subscription_operation_state', [
  'READY',
  'EXECUTING',
  'UNKNOWN',
  'SUCCEEDED',
  'REJECTED',
])
export const subscriptionRecoveryStateEnum = paymentsSchema.enum('subscription_recovery_state', [
  'OPEN',
  'PAYMENT_PENDING',
  'CANCEL_PENDING',
  'RECOVERED',
  'CANCELED',
  'MANUAL_REVIEW',
])
export const outboxStatusEnum = paymentsSchema.enum('outbox_status', [
  'PENDING',
  'PUBLISHED',
  'DEAD',
])
export const idempotencyStateEnum = paymentsSchema.enum('idempotency_state', [
  'IN_FLIGHT',
  'COMPLETED',
])
export const deliveryStatusEnum = paymentsSchema.enum('delivery_status', [
  'PENDING',
  'SUCCEEDED',
  'DEAD',
])

/** Sistemas consumidores autorizados (IP allowlist + segredo HMAC). */
export const consumers = paymentsSchema.table('consumers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  hmacSecret: text('hmac_secret').notNull(),
  allowedCidrs: text('allowed_cidrs').array().notNull().default(sql`ARRAY[]::text[]`),
  // URL para receber os webhooks de saída (notificação de pagamento). Opcional.
  webhookUrl: text('webhook_url'),
  // Eventos aos quais o consumer está inscrito p/ fan-out (além dos próprios).
  subscribedEvents: text('subscribed_events').array().notNull().default(sql`ARRAY[]::text[]`),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const payments = paymentsSchema.table(
  'payments',
  {
    id: uuid('id').primaryKey(),
    // Versão p/ concorrência otimista — `save` faz UPDATE ... WHERE version = ?.
    version: integer('version').notNull().default(0),
    consumerId: text('consumer_id').notNull(),
    status: paymentStatusEnum('status').notNull(),
    method: paymentMethodEnum('method').notNull(),
    amountInCents: bigint('amount_in_cents', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    provider: text('provider').notNull(),
    providerPaymentId: text('provider_payment_id'),
    txid: text('txid'),
    idempotencyKey: text('idempotency_key').notNull(),
    // Apenas dados seguros de cartão (token + bandeira + last4). NUNCA o PAN.
    card: jsonb('card').$type<CardData>(),
    pixQrCode: jsonb('pix_qr_code').$type<PixQrCode>(),
    // Boleto: dados retornados pelo provedor (linha digitável, código de barras, PDF).
    boleto: jsonb('boleto').$type<BoletoDetails>(),
    // Boleto: params da requisição (vencimento, multa/juros) p/ criação assíncrona.
    boletoRequest: jsonb('boleto_request').$type<BoletoRequest>(),
    customer: jsonb('customer').$type<CustomerJson>(),
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    failureReason: text('failure_reason'),
    // Assinatura-pai quando o pagamento é um ciclo recorrente (senão null).
    subscriptionId: uuid('subscription_id'),
    // Modo assíncrono: controle do worker que cria a cobrança no provedor.
    chargeAttempts: integer('charge_attempts').notNull().default(0),
    chargeClaimedAt: timestamp('charge_claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('payments_consumer_idem_uq').on(t.consumerId, t.idempotencyKey),
    index('payments_status_idx').on(t.status),
    // ÚNICO (parcial): o txid é determinístico (derivado do paymentId) e
    // `findByTxid` assume 1 linha — a unique transforma a invariante "1 txid =
    // 1 pagamento" em garantia do BANCO (defesa em profundidade contra bug de
    // derivação/colisão), não só da lógica de aplicação.
    uniqueIndex('payments_txid_uq').on(t.txid).where(sql`txid IS NOT NULL`),
    index('payments_provider_payment_idx').on(t.provider, t.providerPaymentId),
    // Índice parcial para o worker de criação de cobrança (fila de "aguardando charge").
    index('payments_pending_charge_idx')
      .on(t.createdAt)
      .where(sql`provider_payment_id IS NULL AND status = 'PENDING'`),
    // Índice parcial para o scan de reconciliação (PENDING com cobrança criada).
    index('payments_reconcile_idx')
      .on(t.updatedAt)
      .where(sql`status = 'PENDING' AND provider_payment_id IS NOT NULL`),
    // Listar os ciclos de uma assinatura.
    index('payments_subscription_idx').on(t.subscriptionId),
    // "Minhas compras" (self-service do comprador, app community): filtro por
    // e-mail do `customer` (jsonb). Consulte SEMPRE com lower() p/ casar o índice.
    index('payments_customer_email_idx').on(sql`lower((${t.customer} ->> 'email'))`),
    // Sort default das listas (admin + /my: ORDER BY created_at DESC) e janela
    // das agregações por criação — sem ele a lista vira full sort na tabela toda.
    index('payments_created_at_idx').on(t.createdAt),
    // Janela do "recebido" no stats/daily (agrupa por paid_at). Parcial: só
    // linhas confirmadas têm paid_at.
    index('payments_paid_at_idx').on(t.paidAt).where(sql`paid_at IS NOT NULL`),
    // Busca livre `q` do admin (ILIKE '%…%' em 4 colunas via OR): trigram GIN
    // (pg_trgm — a extensão é criada na migration) torna cada ramo indexável e o
    // OR vira BitmapOr; sem isso cada tecla digitada no painel = seq scan duplo
    // (lista + count). As expressões DEVEM casar EXATAS com as do buildWhere.
    index('payments_txid_trgm_idx').using('gin', t.txid.op('gin_trgm_ops')),
    index('payments_provider_payment_trgm_idx').using(
      'gin',
      t.providerPaymentId.op('gin_trgm_ops'),
    ),
    index('payments_id_text_trgm_idx').using('gin', sql`(${t.id}::text) gin_trgm_ops`),
    index('payments_customer_email_trgm_idx').using(
      'gin',
      sql`(${t.customer} ->> 'email') gin_trgm_ops`,
    ),
  ],
)

/** Assinaturas (recorrência via cartão, gerenciada pela Efí). */
export const subscriptions = paymentsSchema.table(
  'subscriptions',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    consumerId: text('consumer_id').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    provider: text('provider').notNull(),
    providerSubscriptionId: text('provider_subscription_id'),
    // plan_id da Efí (reutilizável; mapeado em subscription_plans).
    providerPlanId: text('provider_plan_id').notNull(),
    intervalMonths: integer('interval_months').notNull(),
    // null = ilimitado.
    repeats: integer('repeats'),
    amountInCents: bigint('amount_in_cents', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    // Apenas dados seguros do cartão (bandeira + last4). NUNCA token/PAN.
    card: jsonb('card').$type<{ brand: string; last4: string }>().notNull(),
    customer: jsonb('customer').$type<CustomerJson>(),
    idempotencyKey: text('idempotency_key').notNull(),
    cyclesCompleted: integer('cycles_completed').notNull().default(0),
    // Último charge_id contabilizado (torna recordCharge idempotente).
    lastChargeId: text('last_charge_id'),
    lastChargeAt: timestamp('last_charge_at', { withTimezone: true }),
    // Cursor operacional do backstop de renovação. Não pertence ao agregado:
    // reivindicar um scan não é uma mudança no contrato da assinatura.
    lastReconciledAt: timestamp('last_reconciled_at', { withTimezone: true }),
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    cancelRequestedAt: timestamp('cancel_requested_at', { withTimezone: true }),
    cancellationNextAttemptAt: timestamp('cancellation_next_attempt_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('subscriptions_consumer_idem_uq').on(t.consumerId, t.idempotencyKey),
    index('subscriptions_provider_sub_idx').on(t.provider, t.providerSubscriptionId),
    index('subscriptions_status_idx').on(t.status),
    index('subscriptions_cancellation_requests_idx')
      .on(t.cancellationNextAttemptAt, t.cancelRequestedAt)
      .where(sql`${t.cancelRequestedAt} is not null and ${t.status} in ('ACTIVE', 'PENDING')`),
    index('subscriptions_reconcile_idx')
      .on(t.lastReconciledAt.asc().nullsFirst(), t.lastChargeAt.asc().nullsFirst(), t.id.asc())
      .where(sql`status = 'ACTIVE' AND provider_subscription_id IS NOT NULL`),
    // Sort default da lista admin (ORDER BY created_at DESC).
    index('subscriptions_created_at_idx').on(t.createdAt),
    // Busca livre `q` do admin (ver payments_*_trgm_idx).
    index('subscriptions_provider_sub_trgm_idx').using(
      'gin',
      t.providerSubscriptionId.op('gin_trgm_ops'),
    ),
    index('subscriptions_id_text_trgm_idx').using('gin', sql`(${t.id}::text) gin_trgm_ops`),
    index('subscriptions_customer_email_trgm_idx').using(
      'gin',
      sql`(${t.customer} ->> 'email') gin_trgm_ops`,
    ),
    // "Minhas assinaturas" (self-service do comprador): escopo por e-mail do
    // `customer` (jsonb). Consulte SEMPRE com lower() p/ casar o índice.
    index('subscriptions_customer_email_idx').on(sql`lower((${t.customer} ->> 'email'))`),
  ],
)

/**
 * Mapeamento de planos de recorrência reutilizáveis na Efí, chaveado por
 * (provider, intervalMonths, repeats). `repeatsKey` materializa `repeats ?? -1`
 * para um índice único determinístico (NULLs são distintos em UNIQUE no Postgres,
 * o que furaria a deduplicação de "ilimitado").
 */
export const subscriptionPlans = paymentsSchema.table(
  'subscription_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    intervalMonths: integer('interval_months').notNull(),
    repeats: integer('repeats'),
    /** repeats ?? -1 — normaliza "ilimitado" para uma única linha reutilizável. */
    repeatsKey: integer('repeats_key').notNull(),
    providerPlanId: text('provider_plan_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('subscription_plans_key_uq').on(t.provider, t.intervalMonths, t.repeatsKey)],
)

/**
 * Idempotência de operações de escrita (POST /payments). A chave é **escopada por
 * consumidor** (PK composta) — `Idempotency-Key` é escolhida pelo cliente, então
 * dois consumidores podem usar o mesmo valor sem colidir nem vazar respostas.
 */
export const idempotencyKeys = paymentsSchema.table(
  'idempotency_keys',
  {
    consumerId: text('consumer_id').notNull(),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    // Token do dono da reserva (fencing): complete/release só afetam a reserva que
    // os criou → uma request zumbi (cuja reserva IN_FLIGHT expirou e foi reciclada
    // por outra) não sobrescreve/apaga a reserva viva do novo dono. Nulo apenas em
    // linhas anteriores à migração que adicionou a coluna.
    reservationId: text('reservation_id'),
    state: idempotencyStateEnum('state').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.consumerId, t.key] }),
    index('idempotency_expires_idx').on(t.expiresAt),
  ],
)

/** Outbox transacional: eventos de domínio gravados junto do agregado. */
export const outbox = paymentsSchema.table(
  'outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    aggregateId: text('aggregate_id').notNull(),
    eventName: text('event_name').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: outboxStatusEnum('status').notNull().default('PENDING'),
    attemptCount: integer('attempt_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [index('outbox_status_created_idx').on(t.status, t.createdAt)],
)

/** Webhooks recebidos (dedupe + auditoria). */
export const webhookEvents = paymentsSchema.table(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('webhook_provider_event_uq').on(t.provider, t.providerEventId)],
)

/** Fila de entrega de webhooks de saída para os consumidores (at-least-once + retry). */
export const webhookDeliveries = paymentsSchema.table(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    consumerId: text('consumer_id').notNull(),
    eventName: text('event_name').notNull(),
    // Chave de dedupe (normalmente o paymentId): torna o enqueue idempotente,
    // então republicações do outbox não geram entregas duplicadas.
    dedupKey: text('dedup_key').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: deliveryStatusEnum('status').notNull().default('PENDING'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lastStatusCode: integer('last_status_code'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('webhook_deliveries_due_idx').on(t.status, t.nextAttemptAt),
    uniqueIndex('webhook_deliveries_dedup_uq').on(t.consumerId, t.eventName, t.dedupKey),
  ],
)

/** Intenções financeiras: persiste autoridade e resultado, nunca o token do cartão. */
export const subscriptionOperations = paymentsSchema.table(
  'subscription_operations',
  {
    id: uuid('id').primaryKey(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id),
    consumerId: text('consumer_id').notNull(),
    providerSubscriptionId: text('provider_subscription_id').notNull(),
    kind: subscriptionOperationKindEnum('kind').notNull(),
    state: subscriptionOperationStateEnum('state').notNull(),
    providerPaymentId: text('provider_payment_id'),
    amountInCents: bigint('amount_in_cents', { mode: 'bigint' }),
    currency: text('currency').notNull().default('BRL'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    executionId: uuid('execution_id'),
    executionAttempts: integer('execution_attempts').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    result: text('result'),
  },
  (table) => [
    uniqueIndex('subscription_operations_active_uq')
      .on(table.subscriptionId)
      .where(sql`${table.state} in ('READY', 'EXECUTING', 'UNKNOWN')`),
    index('subscription_operations_subscription_idx').on(table.subscriptionId, table.createdAt),
    index('subscription_operations_pending_idx').on(table.state, table.startedAt),
    check(
      'subscription_operations_amount_check',
      sql`(
      (${table.kind} = 'RETRY' and ${table.providerPaymentId} is not null and ${table.amountInCents} is not null and ${table.amountInCents} > 0)
    or (${table.kind} <> 'RETRY' and ${table.providerPaymentId} is null and ${table.amountInCents} is null)
  )`,
    ),
    check('subscription_operations_currency_check', sql`${table.currency} = 'BRL'`),
    check('subscription_operations_deadline_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'subscription_operations_execution_check',
      sql`(${table.executionAttempts} = 0 and ${table.executionId} is null) or (${table.executionAttempts} > 0 and ${table.executionId} is not null and ${table.startedAt} is not null)`,
    ),
  ],
)

/** Caso durável: política congelada, relógio independente e lease com fencing. */
export const subscriptionRecoveryCases = paymentsSchema.table(
  'subscription_recovery_cases',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id),
    consumerId: text('consumer_id').notNull(),
    providerSubscriptionId: text('provider_subscription_id').notNull(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id),
    providerPaymentId: text('provider_payment_id').notNull(),
    audience: text('audience').$type<'kids' | 'adult'>().notNull(),
    amountInCents: bigint('amount_in_cents', { mode: 'bigint' }).notNull(),
    policy: jsonb('policy').$type<RecoveryPolicy>().notNull(),
    state: subscriptionRecoveryStateEnum('state').notNull(),
    reason: text('reason').$type<RecoveryReason>(),
    firstFailureAt: timestamp('first_failure_at', { withTimezone: true }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    initialNoticeId: text('initial_notice_id'),
    initialNoticeAcceptedAt: timestamp('initial_notice_accepted_at', { withTimezone: true }),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }),
    lastReminderDay: integer('last_reminder_day').notNull().default(0),
    lastProviderCheckAt: timestamp('last_provider_check_at', { withTimezone: true }),
    nextActionAt: timestamp('next_action_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    leaseId: uuid('lease_id'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('subscription_recovery_origin_uq').on(table.paymentId),
    uniqueIndex('subscription_recovery_active_uq')
      .on(table.subscriptionId)
      .where(sql`${table.state} in ('OPEN', 'PAYMENT_PENDING', 'CANCEL_PENDING', 'MANUAL_REVIEW')`),
    index('subscription_recovery_due_idx')
      .on(table.nextActionAt)
      .where(sql`${table.nextActionAt} is not null`),
    index('subscription_recovery_audience_idx').on(table.audience, table.state, table.openedAt),
    check('subscription_recovery_amount_check', sql`${table.amountInCents} > 0`),
    check('subscription_recovery_version_check', sql`${table.version} >= 0`),
    check('subscription_recovery_audience_check', sql`${table.audience} in ('kids', 'adult')`),
    check('subscription_recovery_failure_check', sql`${table.firstFailureAt} <= ${table.openedAt}`),
    check(
      'subscription_recovery_policy_check',
      sql`${table.policy} ? 'version' and ${table.policy} ? 'windowDays' and ${table.policy} ? 'reminderDays' and jsonb_typeof(${table.policy}->'version') = 'number' and jsonb_typeof(${table.policy}->'windowDays') = 'number' and (${table.policy}->>'version')::integer > 0 and (${table.policy}->>'windowDays')::integer between 1 and 30 and jsonb_typeof(${table.policy}->'reminderDays') = 'array'`,
    ),
    check(
      'subscription_recovery_notice_check',
      sql`(
    (${table.initialNoticeId} is null and ${table.initialNoticeAcceptedAt} is null and ${table.deadlineAt} is null)
    or (${table.initialNoticeId} is not null and ${table.initialNoticeAcceptedAt} is not null and ${table.deadlineAt} is not null
      and ${table.initialNoticeAcceptedAt} >= ${table.openedAt}
      and ${table.deadlineAt} = ${table.initialNoticeAcceptedAt} + ((${table.policy}->>'windowDays')::integer * interval '86400 seconds'))
  )`,
    ),
    check(
      'subscription_recovery_terminal_check',
      sql`(${table.state} in ('RECOVERED', 'CANCELED')) = (${table.closedAt} is not null)`,
    ),
    check(
      'subscription_recovery_due_check',
      sql`(${table.state} in ('RECOVERED', 'CANCELED', 'MANUAL_REVIEW')) = (${table.nextActionAt} is null)`,
    ),
    check(
      'subscription_recovery_closed_check',
      sql`${table.closedAt} is null or ${table.closedAt} >= ${table.openedAt}`,
    ),
    check(
      'subscription_recovery_reason_check',
      sql`${table.reason} is null or ${table.reason} in ('PAID', 'EXTERNAL_CANCELLATION', 'UNPAID_AFTER_NOTICE', 'PAYMENT_UNCERTAIN', 'CONTACT_FAILED', 'PROVIDER_DIVERGENCE')`,
    ),
    check(
      'subscription_recovery_cancel_notice_check',
      sql`${table.state} <> 'CANCEL_PENDING' or ${table.initialNoticeId} is not null`,
    ),
    check(
      'subscription_recovery_lease_check',
      sql`(${table.leaseId} is null) = (${table.leaseUntil} is null)`,
    ),
  ],
)

/** Exact outbound envelope and receipt; no card data or raw provider response. */
export const subscriptionRecoveryNotices = paymentsSchema.table(
  'subscription_recovery_notices',
  {
    id: uuid('id').primaryKey(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => subscriptionRecoveryCases.id),
    purpose: text('purpose').$type<RecoveryNoticePurpose>().notNull(),
    day: integer('day').notNull(),
    request: jsonb('request').$type<RecoveryMessageRequest>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    messageId: uuid('message_id'),
    messageStatus: text('message_status').$type<RecoveryMessageReceipt['status']>(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    observedAt: timestamp('observed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('subscription_recovery_notices_purpose_uq').on(t.caseId, t.purpose, t.day),
    uniqueIndex('subscription_recovery_notices_message_uq').on(t.messageId),
    check(
      'subscription_recovery_notices_purpose_check',
      sql`${t.purpose} in ('INITIAL', 'REMINDER', 'RECOVERED', 'CANCELED')`,
    ),
    check(
      'subscription_recovery_notices_day_check',
      sql`(${t.purpose} = 'REMINDER' and ${t.day} between 1 and 29) or (${t.purpose} <> 'REMINDER' and ${t.day} = 0)`,
    ),
    check(
      'subscription_recovery_notices_attempt_check',
      sql`${t.attemptCount} >= 0 and ((${t.attemptCount} = 0 and ${t.lastAttemptAt} is null) or (${t.attemptCount} > 0 and ${t.lastAttemptAt} is not null and ${t.lastAttemptAt} >= ${t.createdAt}))`,
    ),
    check(
      'subscription_recovery_notices_receipt_check',
      sql`(${t.messageId} is null and ${t.messageStatus} is null and ${t.acceptedAt} is null and ${t.deliveredAt} is null and ${t.observedAt} is null) or (${t.messageId} is not null and ${t.messageStatus} is not null and ${t.acceptedAt} is not null and ${t.observedAt} is not null and ${t.acceptedAt} >= ${t.createdAt} and ${t.observedAt} >= ${t.acceptedAt} and (${t.deliveredAt} is null or ${t.deliveredAt} between ${t.acceptedAt} and ${t.observedAt}))`,
    ),
    check(
      'subscription_recovery_notices_status_check',
      sql`${t.messageStatus} is null or ${t.messageStatus} in ('QUEUED', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SUPPRESSED')`,
    ),
    check(
      'subscription_recovery_notices_delivery_check',
      sql`${t.messageStatus} is null or ${t.messageStatus} not in ('DELIVERED', 'READ') or ${t.deliveredAt} is not null`,
    ),
  ],
)

export const subscriptionRecoveryPolicy = paymentsSchema.table(
  'subscription_recovery_policy',
  {
    id: integer('id').primaryKey(),
    version: integer('version').notNull(),
    windowDays: integer('window_days').notNull(),
    reminderDays: jsonb('reminder_days').$type<readonly number[]>().notNull(),
    enabled: boolean('enabled').notNull().default(false),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    updatedBy: text('updated_by').notNull(),
  },
  (table) => [
    check('subscription_recovery_policy_singleton', sql`${table.id} = 1`),
    check('subscription_recovery_policy_version', sql`${table.version} > 0`),
    check('subscription_recovery_policy_window', sql`${table.windowDays} between 1 and 30`),
    check(
      'subscription_recovery_policy_reminders',
      sql`jsonb_typeof(${table.reminderDays}) = 'array'`,
    ),
    check(
      'subscription_recovery_policy_activation',
      sql`not ${table.enabled} or ${table.activatedAt} is not null`,
    ),
  ],
)

export const subscriptionRecoveryPolicyAudit = paymentsSchema.table(
  'subscription_recovery_policy_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: integer('version').notNull(),
    actorId: text('actor_id').notNull(),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex('subscription_recovery_policy_audit_version_uq').on(table.version)],
)

export const schema = {
  consumers,
  payments,
  subscriptions,
  subscriptionPlans,
  subscriptionOperations,
  subscriptionRecoveryCases,
  subscriptionRecoveryNotices,
  subscriptionRecoveryPolicy,
  subscriptionRecoveryPolicyAudit,
  idempotencyKeys,
  outbox,
  webhookEvents,
  webhookDeliveries,
}
