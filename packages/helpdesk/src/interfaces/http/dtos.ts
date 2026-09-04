import { t } from 'elysia'

// Ids que vão a colunas `uuid` validam o FORMATO na borda — um id lixo chegaria
// ao Postgres como 22P02 e viraria 500 INTERNAL_ERROR (padrão do members/hub).
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const UUID = t.String({ pattern: UUID_PATTERN })

export const IdParams = t.Object({ id: UUID })

const VERSION = t.Integer({ minimum: 0 })

// ── Tickets ──────────────────────────────────────────────────────────────────
const TICKET_STATUS = t.Union([
  t.Literal('new'),
  t.Literal('open'),
  t.Literal('waiting'),
  t.Literal('resolved'),
  t.Literal('closed'),
])

const TICKET_CATEGORY = t.Union([
  t.Literal('curso_acesso'),
  t.Literal('problema_tecnico'),
  t.Literal('studio'),
  t.Literal('pagamento_reembolso'),
  t.Literal('parceria_comercial'),
  t.Literal('outro'),
])

const TICKET_PRIORITY = t.Union([t.Literal('baixa'), t.Literal('normal'), t.Literal('alta')])
const TICKET_SLA_FILTER = t.Union([
  t.Literal('attention'),
  t.Literal('at_risk'),
  t.Literal('breached'),
])
const TICKET_ASSIGNMENT_FILTER = t.Union([t.Literal('assigned'), t.Literal('unassigned')])
const TICKET_QUEUE_FILTER = t.Literal('unassigned')

export const TicketsQuery = t.Object({
  status: t.Optional(TICKET_STATUS),
  category: t.Optional(TICKET_CATEGORY),
  sla: t.Optional(TICKET_SLA_FILTER),
  assignment: t.Optional(TICKET_ASSIGNMENT_FILTER),
  queue: t.Optional(TICKET_QUEUE_FILTER),
  q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const TicketPatchBody = t.Object({
  status: t.Optional(TICKET_STATUS),
  category: t.Optional(t.Union([TICKET_CATEGORY, t.Null()])),
  priority: t.Optional(t.Union([TICKET_PRIORITY, t.Null()])),
  assignToMe: t.Optional(t.Boolean()),
  version: VERSION,
})

export const ReplyBody = t.Object({
  body: t.String({ minLength: 1, maxLength: 50_000 }),
  version: VERSION,
})

export const DeliveryParams = t.Object({ id: UUID, messageId: UUID })
/** Confirmação explícita: a equipe aceita o risco residual antes de reenviar. */
export const DeliveryDiscardBody = t.Object({
  confirmation: t.Literal('delivery-not-confirmed'),
})

export const NoteBody = t.Object({
  body: t.String({ minLength: 1, maxLength: 10_000 }),
})

// ── Portal do responsável ───────────────────────────────────────────────────
export const CustomerTicketsQuery = t.Object({
  status: t.Optional(TICKET_STATUS),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
  cursor: t.Optional(t.String({ minLength: 1, maxLength: 256 })),
})

export const CustomerTicketCreateBody = t.Object({
  subject: t.String({ minLength: 3, maxLength: 300 }),
  body: t.String({ minLength: 1, maxLength: 10_000 }),
  category: t.Optional(TICKET_CATEGORY),
})

export const CustomerTicketMessageBody = t.Object({
  body: t.String({ minLength: 1, maxLength: 10_000 }),
})

// ── Base de conhecimento ─────────────────────────────────────────────────────
export const KbQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const KbCreateBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 300 }),
  content: t.String({ minLength: 1, maxLength: 50_000 }),
  published: t.Optional(t.Boolean()),
})

export const KbPatchBody = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
  content: t.Optional(t.String({ minLength: 1, maxLength: 50_000 })),
  published: t.Optional(t.Boolean()),
  version: VERSION,
})

// ── OAuth / Conexão ──────────────────────────────────────────────────────────
export const ProviderParams = t.Object({
  provider: t.String({ minLength: 1, maxLength: 20, pattern: '^[a-z]+$' }),
})

// O Google anexa params extras (scope/authuser/prompt) — não rejeitar.
export const OAuthCallbackQuery = t.Object(
  {
    code: t.Optional(t.String({ maxLength: 2000 })),
    state: t.Optional(t.String({ maxLength: 200 })),
    error: t.Optional(t.String({ maxLength: 200 })),
  },
  { additionalProperties: true },
)

// ── Configurações ────────────────────────────────────────────────────────────
export const SettingsPatchBody = t.Object(
  {
    signature: t.Optional(t.String({ maxLength: 2000 })),
  },
  { additionalProperties: false },
)
