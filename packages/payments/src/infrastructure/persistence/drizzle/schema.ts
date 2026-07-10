import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
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
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('subscriptions_consumer_idem_uq').on(t.consumerId, t.idempotencyKey),
    index('subscriptions_provider_sub_idx').on(t.provider, t.providerSubscriptionId),
    index('subscriptions_status_idx').on(t.status),
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

export const schema = {
  consumers,
  payments,
  subscriptions,
  subscriptionPlans,
  idempotencyKeys,
  outbox,
  webhookEvents,
  webhookDeliveries,
}
