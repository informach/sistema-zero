import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
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
import type { Address } from '../../../domain/value-objects/customer'
import type { CardData } from '../../../domain/value-objects/payment-method'

// View de cliente persistida (sem dados sensíveis de cartão).
export interface CustomerJson {
  name: string
  email: string
  document: string
  phone?: string
  address?: Address
}

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
])

export const paymentMethodEnum = pgEnum('payment_method', ['PIX', 'BOLETO', 'CREDIT_CARD'])
export const outboxStatusEnum = pgEnum('outbox_status', ['PENDING', 'PUBLISHED', 'DEAD'])
export const idempotencyStateEnum = pgEnum('idempotency_state', ['IN_FLIGHT', 'COMPLETED'])
export const deliveryStatusEnum = pgEnum('delivery_status', ['PENDING', 'SUCCEEDED', 'DEAD'])

/** Sistemas consumidores autorizados (IP allowlist + segredo HMAC). */
export const consumers = pgTable('consumers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  hmacSecret: text('hmac_secret').notNull(),
  allowedCidrs: text('allowed_cidrs').array().notNull().default(sql`ARRAY[]::text[]`),
  // URL para receber os webhooks de saída (notificação de pagamento). Opcional.
  webhookUrl: text('webhook_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const payments = pgTable(
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
    index('payments_txid_idx').on(t.txid),
    index('payments_provider_payment_idx').on(t.provider, t.providerPaymentId),
    // Índice parcial para o worker de criação de cobrança (fila de "aguardando charge").
    index('payments_pending_charge_idx')
      .on(t.createdAt)
      .where(sql`provider_payment_id IS NULL AND status = 'PENDING'`),
    // Índice parcial para o scan de reconciliação (PENDING com cobrança criada).
    index('payments_reconcile_idx')
      .on(t.updatedAt)
      .where(sql`status = 'PENDING' AND provider_payment_id IS NOT NULL`),
  ],
)

/**
 * Idempotência de operações de escrita (POST /payments). A chave é **escopada por
 * consumidor** (PK composta) — `Idempotency-Key` é escolhida pelo cliente, então
 * dois consumidores podem usar o mesmo valor sem colidir nem vazar respostas.
 */
export const idempotencyKeys = pgTable(
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
export const outbox = pgTable(
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
export const webhookEvents = pgTable(
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
export const webhookDeliveries = pgTable(
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
  idempotencyKeys,
  outbox,
  webhookEvents,
  webhookDeliveries,
}
