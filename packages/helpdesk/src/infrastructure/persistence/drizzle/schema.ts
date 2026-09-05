import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { SendEmailInput } from '../../../domain/ports/messaging-gateway.port'
import type { AiClassification } from '../../../domain/ticket/ticket'
import type { AttachmentMeta } from '../../../domain/ticket/ticket-message'

// Compartilha o MESMO Postgres dos demais serviços, mas é dono do schema
// `helpdesk` (isolamento por `pgSchema`). Sem FK cross-schema: `created_by`/
// `assigned_to` etc. são snapshots do auth (equipe), com `*_name` snapshot.
export const helpdesk = pgSchema('helpdesk')

// ── Enums ────────────────────────────────────────────────────────────────────
export const connectionStatusEnum = helpdesk.enum('connection_status', [
  'connected',
  'needs_reauth',
  'revoked',
  'disabled',
])
export const ticketStatusEnum = helpdesk.enum('ticket_status', [
  'new',
  'open',
  'waiting',
  'resolved',
  'closed',
])
export const ticketSourceEnum = helpdesk.enum('ticket_source', ['email', 'portal'])
export const ticketPortalEnum = helpdesk.enum('ticket_portal', ['adult', 'kids'])
export const ticketCategoryEnum = helpdesk.enum('ticket_category', [
  'curso_acesso',
  'problema_tecnico',
  'studio',
  'pagamento_reembolso',
  'parceria_comercial',
  'outro',
])
export const ticketPriorityEnum = helpdesk.enum('ticket_priority', ['baixa', 'normal', 'alta'])
export const aiStatusEnum = helpdesk.enum('ai_status', [
  'idle',
  'pending',
  'processing',
  'done',
  'failed',
  'skipped',
])
export const messageKindEnum = helpdesk.enum('message_kind', ['email', 'note', 'portal'])
export const messageVisibilityEnum = helpdesk.enum('message_visibility', ['customer', 'internal'])
export const messageDirectionEnum = helpdesk.enum('message_direction', ['inbound', 'outbound'])
export const messageSentViaEnum = helpdesk.enum('message_sent_via', [
  'customer',
  'human',
  'ai',
  'gmail',
])
export const messageDeliveryStateEnum = helpdesk.enum('message_delivery_state', [
  'pending',
  'sent',
  'unknown',
  'failed',
])
export const portalNotificationStatusEnum = helpdesk.enum('portal_notification_status', [
  'pending',
  'processing',
  'sent',
])

// ── Conexão Gmail (tokens CIFRADOS — AES-256-GCM) ────────────────────────────
export const gmailConnections = helpdesk.table(
  'gmail_connections',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    emailAddress: text('email_address').notNull(),
    // `sub` do id_token do Google — identidade estável da conta.
    externalId: text('external_id').notNull(),
    // NUNCA em claro: formato versionado `v1.<iv>.<tag>.<ct>` (secret-box).
    accessTokenEnc: text('access_token_enc'),
    refreshTokenEnc: text('refresh_token_enc'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: text('scopes').array().notNull().default([]),
    status: connectionStatusEnum('status').notNull().default('connected'),
    // uint64 do Gmail — SEMPRE text (nunca int). Null = próximo tick faz backfill.
    lastHistoryId: text('last_history_id'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    // Claim/lease do gmail-sync-worker (espelha o send-worker do messaging).
    syncNextAt: timestamp('sync_next_at', { withTimezone: true }).notNull(),
    syncAttempts: integer('sync_attempts').notNull().default(0),
    lastSyncError: text('last_sync_error'),
    connectedBy: uuid('connected_by').notNull(),
    connectedByName: text('connected_by_name'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('gmail_connections_external_uq').on(t.externalId),
    // Uma constante indexada com predicado parcial torna impossível manter duas
    // caixas elegíveis para o worker, mesmo por um escritor futuro indevido.
    uniqueIndex('gmail_connections_single_active_uq')
      .on(sql`(1)`)
      .where(sql`${t.status} in ('connected', 'needs_reauth')`),
    index('gmail_connections_claim_idx').on(t.status, t.syncNextAt),
  ],
)

// ── Tickets (um por thread do Gmail) ─────────────────────────────────────────
export const tickets = helpdesk.table(
  'tickets',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    gmailThreadId: text('gmail_thread_id'),
    source: ticketSourceEnum('source').notNull().default('email'),
    // App que abriu o chamado pelo portal (link do aviso de resposta). Nulo em
    // e-mail e no legado; imutável depois de criado.
    portal: ticketPortalEnum('portal'),
    subject: text('subject').notNull().default(''),
    status: ticketStatusEnum('status').notNull().default('new'),
    // Fonte de verdade dos indicadores de resolução; `updated_at` muda também
    // com IA, classificação e demais patches que não encerram o chamado.
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    // Null = ainda não classificado (nem pela IA nem por humano).
    category: ticketCategoryEnum('category'),
    // Categoria escolhida por humano NUNCA é sobrescrita pela IA.
    categoryManual: boolean('category_manual').notNull().default(false),
    priority: ticketPriorityEnum('priority'),
    requesterName: text('requester_name'),
    requesterEmail: text('requester_email').notNull(),
    requesterAccountId: uuid('requester_account_id'),
    assignedTo: uuid('assigned_to'),
    assignedToName: text('assigned_to_name'),
    firstMessageAt: timestamp('first_message_at', { withTimezone: true }).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull(),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    messageCount: integer('message_count').notNull().default(0),
    // IA (classificação/resumo/rascunho). `ai_classification` guarda a saída
    // estruturada completa; category/priority são materializados dela.
    aiSummary: text('ai_summary'),
    aiSummaryAt: timestamp('ai_summary_at', { withTimezone: true }),
    aiDraft: text('ai_draft'),
    aiDraftAt: timestamp('ai_draft_at', { withTimezone: true }),
    aiDraftEdited: boolean('ai_draft_edited').notNull().default(false),
    aiClassification: jsonb('ai_classification').$type<AiClassification>(),
    // CAS lógico: cada inbound atual incrementa; workers antigos não podem
    // publicar resultados calculados sobre uma conversa que já mudou.
    aiGeneration: integer('ai_generation').notNull().default(0),
    // Fila de IA embutida (sem tabela de jobs): claim por SKIP LOCKED.
    aiStatus: aiStatusEnum('ai_status').notNull().default('idle'),
    aiNextAttemptAt: timestamp('ai_next_attempt_at', { withTimezone: true }),
    aiAttempts: integer('ai_attempts').notNull().default(0),
    aiLastError: text('ai_last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('tickets_gmail_thread_uq').on(t.gmailThreadId),
    index('tickets_status_last_msg_idx').on(t.status, t.lastMessageAt),
    index('tickets_resolved_at_idx').on(t.resolvedAt),
    // Ownership legado usa lower(email); o índice simples anterior não servia
    // essa expressão.
    index('tickets_requester_email_lower_idx')
      .on(sql`lower(${t.requesterEmail})`)
      .where(sql`${t.requesterAccountId} is null`),
    // Mesma expressão da busca livre com ILIKE; pg_trgm é habilitado pela
    // migration custom anterior à criação deste índice.
    index('tickets_search_trgm_idx').using(
      'gin',
      sql`(coalesce(${t.subject}, '') || ' ' || coalesce(${t.requesterEmail}, '') || ' ' || coalesce(${t.requesterName}, '')) gin_trgm_ops`,
    ),
    index('tickets_requester_account_idx').on(t.requesterAccountId, t.lastMessageAt),
    index('tickets_category_idx').on(t.category),
    // Fila do ai-worker (parcial: só o que está aguardando/rodando).
    index('tickets_ai_claim_idx')
      .on(t.aiStatus, t.aiNextAttemptAt)
      .where(sql`${t.aiStatus} in ('pending', 'processing')`),
  ],
)

// ── Mensagens do ticket (e-mails + notas internas) ───────────────────────────
export const ticketMessages = helpdesk.table(
  'ticket_messages',
  {
    id: uuid('id').primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    kind: messageKindEnum('kind').notNull().default('email'),
    visibility: messageVisibilityEnum('visibility').notNull().default('customer'),
    // Dedupe forte da ingestão (unique tolera N nulls — notas internas).
    gmailMessageId: text('gmail_message_id'),
    // Header `Message-ID` RFC 2822 — base do In-Reply-To/References da resposta.
    rfc822MessageId: text('rfc822_message_id'),
    /** Estado de entrega para outbound criado pelo console; notas não têm estado. */
    deliveryState: messageDeliveryStateEnum('delivery_state'),
    deliveryLastError: text('delivery_last_error'),
    direction: messageDirectionEnum('direction'),
    sentVia: messageSentViaEnum('sent_via'),
    fromEmail: text('from_email'),
    fromName: text('from_name'),
    toEmails: text('to_emails').array().notNull().default([]),
    ccEmails: text('cc_emails').array().notNull().default([]),
    subject: text('subject'),
    bodyText: text('body_text').notNull(),
    bodyHtml: text('body_html'),
    snippet: text('snippet'),
    // SÓ metadados (filename/mime/size/gmail_attachment_id) — bytes no Gmail.
    attachments: jsonb('attachments').$type<AttachmentMeta[]>().notNull().default([]),
    // Inbound de autoresponder/newsletter (Auto-Submitted/X-Autoreply/List-Unsubscribe)
    // preservado como contexto operacional; nunca aciona resposta automática.
    isAutoreply: boolean('is_autoreply').notNull().default(false),
    gmailInternalDate: timestamp('gmail_internal_date', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdByName: text('created_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('ticket_messages_gmail_uq').on(t.gmailMessageId),
    index('ticket_messages_rfc822_idx')
      .on(t.rfc822MessageId)
      .where(sql`${t.rfc822MessageId} is not null and ${t.direction} = 'outbound'`),
    index('ticket_messages_delivery_idx').on(t.ticketId, t.deliveryState, t.createdAt),
    index('ticket_messages_ticket_idx').on(t.ticketId, t.createdAt),
  ],
)

// ── Outbox do aviso de resposta no portal ──────────────────────────────────
export const portalNotificationOutbox = helpdesk.table(
  'portal_notification_outbox',
  {
    id: uuid('id').primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => ticketMessages.id, { onDelete: 'cascade' }),
    payload: jsonb('payload').$type<SendEmailInput>().notNull(),
    status: portalNotificationStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    // Retry e lease permanecem separados para diagnóstico operacional.
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull(),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('portal_notification_outbox_message_uq').on(t.messageId),
    index('portal_notification_outbox_pending_idx')
      .on(t.nextAttemptAt, t.createdAt)
      .where(sql`${t.status} = 'pending'`),
    index('portal_notification_outbox_lease_idx')
      .on(t.leaseExpiresAt, t.createdAt)
      .where(sql`${t.status} = 'processing'`),
  ],
)

// ── Base de conhecimento (artigos editáveis; publicados entram no prompt) ────
export const kbArticles = helpdesk.table(
  'kb_articles',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    title: text('title').notNull(),
    content: text('content').notNull(),
    published: boolean('published').notNull().default(false),
    createdBy: uuid('created_by').notNull(),
    createdByName: text('created_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('kb_articles_published_idx').on(t.published, t.updatedAt)],
)

// ── Configuração (linha única, PK fixo `default`; get-or-create no repo) ─────
export const settings = helpdesk.table('settings', {
  id: text('id').primaryKey(),
  signature: text('signature').notNull().default(''),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
})

// ── OAuth: state + PKCE (single-use, TTL curto) ──────────────────────────────
export const oauthStates = helpdesk.table(
  'oauth_states',
  {
    state: text('state').primaryKey(),
    provider: text('provider').notNull().default('google'),
    codeVerifier: text('code_verifier'),
    createdBy: uuid('created_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('oauth_states_expires_idx').on(t.expiresAt)],
)

export const schema = {
  gmailConnections,
  tickets,
  ticketMessages,
  portalNotificationOutbox,
  kbArticles,
  settings,
  oauthStates,
}
