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
  t.Literal('pagamento_reembolso'),
  t.Literal('parceria_comercial'),
  t.Literal('outro'),
])

const TICKET_PRIORITY = t.Union([t.Literal('baixa'), t.Literal('normal'), t.Literal('alta')])

export const TicketsQuery = t.Object({
  status: t.Optional(TICKET_STATUS),
  category: t.Optional(TICKET_CATEGORY),
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

// ── Configurações ────────────────────────────────────────────────────────────
export const SettingsPatchBody = t.Object({
  autoReplyEnabled: t.Optional(t.Boolean()),
  autoReplyCategories: t.Optional(t.Array(TICKET_CATEGORY, { maxItems: 5 })),
  autoReplyConfidenceMin: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  signature: t.Optional(t.String({ maxLength: 2000 })),
})
