import { boolean, index, integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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

    // Contato (preenchido no pré-checkout; CPF nos dados pessoais do checkout).
    nome: text('nome'),
    email: text('email'),
    telefone: text('telefone'),
    document: text('document'), // CPF sem máscara (devedor do Pix / titular do cartão)

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
    // Cupom aplicado no checkout (catálogo). Persistido p/ registrar o uso (redeem)
    // na confirmação do pagamento (pix/boleto confirmam fora da tela).
    couponCode: text('coupon_code'),
    // Oferta efetivamente comprada (slug do catálogo), gravada no checkout. A
    // concessão de acesso usa ela (com fallback no env) em vez de assumir oferta
    // única → fundação p/ vender mais de um produto (ex.: upsell de assinatura).
    offerRef: text('offer_ref'),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // Comprador registrado no IdP (@sistemazero/auth) após o pagamento confirmado.
    // Desacoplado de `paidAt` → registro é retryável (elegível: paidAt set & registered null).
    // `ensure-buyer` SEMPRE devolve um `buyer_user_id` (novo OU recorrente).
    buyerUserId: text('buyer_user_id'),
    // True só p/ comprador NOVO (recém-criado no IdP) → recebe o e-mail de boas-vindas
    // com o magic-link de 1º acesso. Recorrente (false) já tem credenciais.
    buyerIsNew: boolean('buyer_is_new'),
    buyerRegisteredAt: timestamp('buyer_registered_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('leads_email_idx').on(t.email),
    index('leads_segmento_idx').on(t.segmento),
    index('leads_created_idx').on(t.createdAt),
    // Webhook `payment.paid` resolve o lead pela cobrança (findLeadByPayment).
    index('leads_payment_idx').on(t.paymentId),
  ],
)

/**
 * HISTÓRICO de cobranças por lead (payment_id → lead_id). O `leads.payment_id`
 * guarda só a cobrança MAIS RECENTE (sobrescrito a cada checkout); sem este
 * histórico, o webhook de uma cobrança antiga ainda pagável (boleto vale 3 dias,
 * Pix re-gerado após corrigir dados) não encontraria o lead e a compra se
 * perderia em silêncio. Alimentado pelo `setPayment`; consultado como fallback
 * pelo `findLeadByPayment`.
 */
export const leadPayments = funil.table('lead_payments', {
  paymentId: uuid('payment_id').primaryKey(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

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

export const schema = { leads, funnelEvents, processedWebhooks, leadPayments }
