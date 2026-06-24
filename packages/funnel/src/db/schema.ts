import { boolean, index, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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

    // Respostas do quiz em JSON (chave snake_case → valor): GENÉRICO p/ cada funil ter
    // o seu próprio quiz (perguntas diferentes). A validação por chave e o cálculo de
    // derivados (ex.: custo_mensal) + o perfil vivem no módulo do funil (src/funnels).
    quizAnswers: jsonb('quiz_answers').$type<Record<string, string | number>>(),
    // Perfil/diagnóstico vencedor (string por funil), calculado ao concluir o quiz.
    // Mantido como coluna: a aba Perfis do /admin agrega por ele.
    perfilResultado: text('perfil_resultado'),

    // Funil de origem do lead (`${audience}/${produto}`, ex.: `pro/no-comando-da-ia`),
    // gravado na CRIAÇÃO. Resolve a oferta/conteúdo certos quando há mais de um produto;
    // nullable → leads legados (pré-multifunil) caem no funil default (ver src/funnels).
    funnel: text('funnel'),

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
    // One-shot ATÔMICO do welcome (claim via UPDATE … WHERE IS NULL): o welcome
    // NÃO pode rodar 2× — o auth CONSOME os tokens pendentes ao emitir um novo
    // (1 vivo/usuário) e o messaging deduplica o reenvio; uma 2ª execução
    // (webhook × polling) invalidaria o token do e-mail JÁ entregue (link morto).
    welcomeSentAt: timestamp('welcome_sent_at', { withTimezone: true }),
    // Concessão na área de membros CONCLUÍDA (one-shot): poll repetido após pago
    // não re-chama o members (a concessão lá é idempotente, mas cada re-chamada
    // era um S2S real por poll).
    membersGrantedAt: timestamp('members_granted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('leads_email_idx').on(t.email),
    // Segmentação por funil (filtro do /admin por produto/público).
    index('leads_funnel_idx').on(t.funnel),
    // Aba PERFIS do /admin agrega `count(*) group by perfil_resultado`.
    index('leads_perfil_idx').on(t.perfilResultado),
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
  // Cupom aplicado NESTA cobrança (null = sem cupom). O redeem da confirmação lê
  // daqui (cobrança efetivamente paga) — `leads.coupon_code` é só o contexto do
  // ÚLTIMO checkout e ficava obsoleto (re-cotação sem cupom redimia cupom não
  // aplicado; boleto antigo com cupom pago depois não redimia o certo).
  couponCode: text('coupon_code'),
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
    // Contexto opcional do evento (ex.: { perfil_resultado } no viu_pagina_vendas).
    metadata: jsonb('metadata'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('funnel_events_lead_idx').on(t.leadId),
    // Composto (substitui o índice só de event_name, prefixo redundante): o
    // dashboard agrega `count(distinct lead_id) group by event_name` sobre uma
    // tabela que NUNCA é podada — com o composto vira index-only scan.
    index('funnel_events_name_lead_idx').on(t.eventName, t.leadId),
  ],
)

/** Dedupe dos webhooks recebidos (at-least-once → idempotência por delivery id). */
export const processedWebhooks = funil.table('processed_webhooks', {
  deliveryId: text('delivery_id').primaryKey(),
  paymentId: uuid('payment_id'),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})

export const schema = { leads, funnelEvents, processedWebhooks, leadPayments }
