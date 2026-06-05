import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Este package compartilha o Postgres `sistemazero` do monorepo, mas é dono do
// schema `messaging` (isolamento por `pgSchema`). Todo o DDL gerado fica em `messaging.*`.
export const messagingSchema = pgSchema('messaging')

export const channelEnum = messagingSchema.enum('channel', ['email', 'whatsapp'])

export const messageStatusEnum = messagingSchema.enum('message_status', [
  'QUEUED', // recém-criada, aguardando agendamento/claim
  'SCHEDULED', // com `scheduled_at` futuro (envio adiado)
  'SENDING', // claim feito, chamada ao provedor em andamento
  'SENT', // aceita pelo provedor
  'DELIVERED', // entregue ao destinatário (confirmado por webhook)
  'READ', // lida (só WhatsApp)
  'FAILED', // falhou em definitivo (tentativas esgotadas / 4xx / inválido)
  'SUPPRESSED', // destinatário em lista de supressão (hard bounce/spam/unsub)
])

export const emailSenderStatusEnum = messagingSchema.enum('email_sender_status', [
  'VERIFIED',
  'UNVERIFIED',
])

export const instanceStatusEnum = messagingSchema.enum('whatsapp_instance_status', [
  'CONNECTED',
  'DISCONNECTED',
  'PAUSED',
  'BANNED',
])

export const outboxStatusEnum = messagingSchema.enum('outbox_status', [
  'PENDING',
  'PUBLISHED',
  'DEAD',
])

// ── Templates ────────────────────────────────────────────────────────────────
export const messageTemplates = messagingSchema.table(
  'message_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    channel: channelEnum('channel').notNull(),
    name: text('name').notNull(),
    subject: text('subject'), // só e-mail
    body: text('body').notNull(),
    // Variáveis obrigatórias declaradas (validadas na renderização).
    variables: jsonb('variables').$type<string[]>().notNull().default([]),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('message_templates_channel_key_uq').on(t.channel, t.key)],
)

// ── Pool de remetentes de e-mail (from configurável) ──────────────────────────
export const emailSenders = messagingSchema.table(
  'email_senders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromEmail: text('from_email').notNull(),
    fromName: text('from_name').notNull(),
    replyTo: text('reply_to'),
    status: emailSenderStatusEnum('status').notNull().default('UNVERIFIED'),
    enabled: boolean('enabled').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('email_senders_from_email_uq').on(t.fromEmail),
    // No máximo um remetente default.
    uniqueIndex('email_senders_single_default_uq').on(t.isDefault).where(sql`${t.isDefault}`),
  ],
)

// ── Pool de números/instâncias de WhatsApp (rotação + estado de ritmo) ─────────
export const whatsappInstances = messagingSchema.table(
  'whatsapp_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instanceName: text('instance_name').notNull(), // nome da instância na Evolution
    phoneNumber: text('phone_number').notNull(), // exibição/auditoria
    status: instanceStatusEnum('status').notNull().default('DISCONNECTED'),
    enabled: boolean('enabled').notNull().default(true),
    dailyCap: integer('daily_cap').notNull().default(200),
    sentToday: integer('sent_today').notNull().default(0),
    // Dia (UTC) ao qual `sent_today` se refere — reset quando vira o dia.
    dayCursor: date('day_cursor'),
    messagesSinceRest: integer('messages_since_rest').notNull().default(0),
    // A lane só pode enviar de novo quando now() >= next_available_at
    // (codifica o delay aleatório entre mensagens + o descanso após N).
    nextAvailableAt: timestamp('next_available_at', { withTimezone: true }).notNull().defaultNow(),
    // Início do aquecimento (curva de teto menor nos primeiros dias). Null = sem aquecimento.
    warmupStartedAt: timestamp('warmup_started_at', { withTimezone: true }),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('whatsapp_instances_instance_name_uq').on(t.instanceName),
    index('whatsapp_instances_dispatch_idx').on(t.enabled, t.status, t.nextAvailableAt),
  ],
)

// ── Mensagens (uma linha por solicitação de envio) ────────────────────────────
export const messages = messagingSchema.table(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channel: channelEnum('channel').notNull(),
    templateKey: text('template_key').notNull(),
    templateId: uuid('template_id'),
    recipientName: text('recipient_name').notNull(),
    recipientEmail: text('recipient_email'),
    recipientPhone: text('recipient_phone'),
    variables: jsonb('variables').$type<Record<string, string>>().notNull().default({}),
    renderedSubject: text('rendered_subject'),
    renderedBody: text('rendered_body').notNull(),
    senderId: uuid('sender_id'), // e-mail: remetente resolvido
    laneId: uuid('lane_id'), // whatsapp: instância que enviou (atribuída no claim)
    priority: integer('priority').notNull().default(0), // maior = mais cedo
    status: messageStatusEnum('status').notNull().default('QUEUED'),
    providerMessageId: text('provider_message_id'),
    failureReason: text('failure_reason'),
    failureCode: text('failure_code'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    consumerId: text('consumer_id'),
    idempotencyKey: text('idempotency_key'),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    terminalAt: timestamp('terminal_at', { withTimezone: true }),
  },
  (t) => [
    // Claim do worker (mensagens devidas por canal).
    index('messages_dispatch_idx').on(t.channel, t.status, t.scheduledAt, t.nextAttemptAt),
    // Match de webhook de status (por id do provedor).
    index('messages_provider_message_id_idx').on(t.providerMessageId),
    // Dedupe da SOLICITAÇÃO de envio (idempotência por consumidor).
    uniqueIndex('messages_idempotency_uq')
      .on(t.consumerId, t.idempotencyKey)
      .where(sql`${t.consumerId} is not null and ${t.idempotencyKey} is not null`),
  ],
)

// ── Dedupe de webhooks de status (inbound) ────────────────────────────────────
export const webhookEvents = messagingSchema.table(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(), // 'sendgrid' | 'evolution'
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    messageId: uuid('message_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('webhook_events_provider_event_uq').on(t.provider, t.providerEventId)],
)

// ── Supressões (não reenviar a hard-bounce/spam/unsub) ────────────────────────
export const suppressions = messagingSchema.table(
  'suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channel: channelEnum('channel').notNull(),
    address: text('address').notNull(), // e-mail ou telefone
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('suppressions_channel_address_uq').on(t.channel, t.address)],
)

// ── Outbox transacional (eventos de domínio) ──────────────────────────────────
export const outbox = messagingSchema.table(
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

export const schema = {
  messageTemplates,
  emailSenders,
  whatsappInstances,
  messages,
  webhookEvents,
  suppressions,
  outbox,
}
