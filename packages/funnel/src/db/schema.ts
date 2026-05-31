import { index, integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Este package compartilha o MESMO Postgres do payments, mas é dono do schema
// `funil` (isolamento por `pgSchema`). O DDL gerado fica todo em `funil.*`.
export const funil = pgSchema('funil')

/**
 * Lead do funil. Criado já na entrada da landing e enriquecido a cada resposta do
 * quiz (salvamento parcial). Valores monetários em CENTAVOS (igual `amountInCents`
 * do payments).
 */
export const leads = funil.table(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Contato (preenchido no pré-checkout).
    nome: text('nome'),
    email: text('email'),
    telefone: text('telefone'),

    // 12 chaves do quiz (parciais até o lead concluir).
    segmento: text('segmento'), // A | B | C | D
    gastoTerceiros: integer('gasto_terceiros'), // centavos
    formaDeCriar: text('forma_de_criar'), // A | B | C | D
    jaQuebrou: text('ja_quebrou'), // sim | nao
    nivelRefem: integer('nivel_refem'), // slider 1..10
    horasRetrabalho: integer('horas_retrabalho'), // horas/semana
    valorHora: integer('valor_hora'), // centavos
    custoMensal: integer('custo_mensal'), // centavos (derivado: horas*valor*4)
    pesoPrincipal: text('peso_principal'), // A | B | C | D
    visualizacao: text('visualizacao'), // A | B | C | D
    oQueFalta: text('o_que_falta'), // A | B | C | D
    mudancaDesejada: text('mudanca_desejada'), // A | B | C | D

    // Progresso / pagamento.
    lastStep: text('last_step').notNull().default('entrou_landing'),
    paymentId: uuid('payment_id'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('leads_email_idx').on(t.email),
    index('leads_segmento_idx').on(t.segmento),
    index('leads_created_idx').on(t.createdAt),
  ],
)

/** Eventos do funil (analytics). Um lead gera N eventos ao longo do percurso. */
export const funnelEvents = funil.table(
  'funnel_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    eventName: text('event_name').notNull(),
    step: text('step'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('funnel_events_lead_idx').on(t.leadId),
    index('funnel_events_name_idx').on(t.eventName),
  ],
)

/** Dedupe dos webhooks recebidos (at-least-once → idempotência por delivery id). */
export const processedWebhooks = funil.table('processed_webhooks', {
  deliveryId: text('delivery_id').primaryKey(),
  paymentId: uuid('payment_id'),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})

export const schema = { leads, funnelEvents, processedWebhooks }
