import { and, asc, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import type { Database } from './client'
import { funnelEvents, leadPayments, leads, processedWebhooks } from './schema'

export type Lead = typeof leads.$inferSelect
/** Campos do lead atualizáveis via updateLead (contato/funil/perfil; respostas em quiz_answers). */
export type LeadUpdate = Partial<typeof leads.$inferInsert>

export interface EventCount {
  eventName: string
  leads: number
}

/** Contagem de leads por perfil do diagnóstico (aba PERFIS do /admin). */
export interface PerfilCount {
  perfil: string
  count: number
}

/** Snapshot congelado da cobrança criada (usado quando aquela cobrança confirma). */
export interface PaymentSnapshot {
  offerRef?: string | null
  nome?: string | null
  email?: string | null
  telefone?: string | null
  document?: string | null
}

/** Contexto persistido por `payment_id` em `lead_payments`. */
export interface PaymentContext {
  couponCode: string | null
  offerRef: string | null
  nome: string | null
  email: string | null
  telefone: string | null
  document: string | null
}

/** Filtro/ordenação da listagem de leads (busca por nome/e-mail + funil + data). */
export interface LeadFilter {
  /** Busca case-insensitive em nome OU e-mail. */
  q?: string
  /** Ordem por `created_at` (default `desc` = mais recentes primeiro). */
  sort?: 'asc' | 'desc'
  /** Filtra por funil de origem (`${audience}/${produto}`). */
  funnel?: string
}

/**
 * Escapa os curingas do LIKE/ILIKE (`%`, `_` e o próprio `\`) para que a busca
 * trate o termo como literal — sem isto, `%` no input vira "casa tudo" e `_`
 * vira "qualquer char" (padrão do monorepo; espelha o escapeLike do catalog).
 */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** WHERE compartilhado por `listLeads`/`countLeads` (busca nome/e-mail + funil). */
function leadWhere(filter?: Pick<LeadFilter, 'q' | 'funnel'>): SQL | undefined {
  const conds: SQL[] = []
  const term = filter?.q?.trim()
  if (term) {
    const like = `%${escapeLike(term)}%`
    const search = or(ilike(leads.nome, like), ilike(leads.email, like))
    if (search) conds.push(search)
  }
  if (filter?.funnel) conds.push(eq(leads.funnel, filter.funnel))
  return conds.length ? and(...conds) : undefined
}

/**
 * Porta de persistência do funil. Os endpoints dependem desta interface; os testes
 * injetam um fake em memória (DI leve, no espírito do composition-root do payments).
 */
export interface FunnelRepo {
  /** Cria um lead. `funnel` (`${audience}/${produto}`) registra a origem na criação. */
  createLead(funnel?: string | null): Promise<{ id: string }>
  getLead(id: string): Promise<Lead | null>
  updateLead(id: string, set: LeadUpdate): Promise<void>
  /** Mescla respostas no JSON `quiz_answers` (genérico — chaves do quiz de qualquer funil). */
  mergeQuizAnswers(id: string, patch: Record<string, string | number>): Promise<void>
  /**
   * Aponta o lead p/ a cobrança + grava o par no histórico (`lead_payments`),
   * com o cupom e o snapshot aplicados NESTA cobrança (a confirmação lê de lá).
   * `couponCode` ausente (re-aponte do webhook) não sobrescreve o histórico.
   */
  setPayment(
    id: string,
    paymentId: string,
    couponCode?: string | null,
    snapshot?: PaymentSnapshot,
  ): Promise<void>
  /** Cupom aplicado na cobrança (histórico `lead_payments`); null = sem cupom. */
  couponForPayment(paymentId: string): Promise<string | null>
  /** Oferta/comprador congelados por cobrança; null = pagamento fora do histórico. */
  paymentContext(paymentId: string): Promise<PaymentContext | null>
  /** Marca pago se ainda não estava; retorna true se ESTA chamada foi a que pagou. */
  markPaid(id: string, paidAt: Date): Promise<boolean>
  /**
   * Claim ATÔMICO do welcome (one-shot): true só p/ a chamada que venceu
   * (UPDATE … WHERE welcome_sent_at IS NULL). Corrida webhook × polling não
   * pode emitir 2 tokens — o auth consome os pendentes (link já enviado morre).
   */
  claimWelcome(id: string, at: Date): Promise<boolean>
  /** Desfaz o claim quando NADA foi emitido (token falhou) — permite retry futuro. */
  releaseWelcome(id: string): Promise<void>
  /** Marca a concessão na área de membros como concluída (one-shot, preserva o 1º timestamp). */
  setMembersGranted(id: string, at: Date): Promise<void>
  /**
   * Marca o comprador como registrado no IdP (auth). Idempotente: só grava se
   * `buyer_registered_at` ainda for nulo (guarda contra corrida webhook × polling).
   * `ensure-buyer` SEMPRE devolve um `buyerUserId`; `isNew` distingue o comprador
   * novo (recebe boas-vindas) do recorrente (já tem credenciais).
   */
  setBuyerRegistration(
    id: string,
    buyerUserId: string | null,
    isNew: boolean,
    at: Date,
  ): Promise<void>
  findLeadByPayment(paymentId: string): Promise<Lead | null>
  insertEvent(
    leadId: string,
    eventName: string,
    step?: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void>
  listLeads(limit: number, offset: number, filter?: LeadFilter): Promise<Lead[]>
  countLeads(filter?: Pick<LeadFilter, 'q' | 'funnel'>): Promise<number>
  /** Conversão por evento; `funnel` opcional restringe aos leads daquele funil. */
  eventCounts(funnel?: string): Promise<EventCount[]>
  /** Contagem de leads por `perfil_resultado` (ignora nulos); `funnel` opcional filtra. */
  perfilCounts(funnel?: string): Promise<PerfilCount[]>
  /** True se o delivery id já foi processado (dedupe de webhook). */
  isWebhookProcessed(deliveryId: string): Promise<boolean>
  /** Insere o delivery id; retorna false se já existia (webhook duplicado). */
  markWebhookProcessed(deliveryId: string, paymentId: string | null): Promise<boolean>
}

export function createFunnelRepo(db: Database): FunnelRepo {
  return {
    async createLead(funnel = null) {
      const [row] = await db
        .insert(leads)
        .values({ funnel: funnel ?? null })
        .returning({ id: leads.id })
      return { id: row!.id }
    },

    async getLead(id) {
      const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1)
      return row ?? null
    },

    async updateLead(id, set) {
      await db
        .update(leads)
        .set({ ...set, updatedAt: new Date() })
        .where(eq(leads.id, id))
    },

    async mergeQuizAnswers(id, patch) {
      // Mescla (atômico) o patch no JSON de respostas: `coalesce(quiz_answers,{}) || patch`.
      // Genérico — aceita as chaves de QUALQUER funil (o quiz do produto define quais).
      await db
        .update(leads)
        .set({
          quizAnswers: sql`coalesce(${leads.quizAnswers}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, id))
    },

    async setPayment(id, paymentId, couponCode, snapshot) {
      // Além do ponteiro "cobrança atual" no lead, grava o HISTÓRICO em
      // lead_payments (com cupom + comprador/oferta DESTA cobrança) — uma
      // cobrança antiga ainda pagável (boleto/Pix re-gerado) precisa continuar
      // resolvendo o lead no webhook e entregar para o comprador correto.
      await db.transaction(async (tx) => {
        await tx.update(leads).set({ paymentId, updatedAt: new Date() }).where(eq(leads.id, id))
        await tx
          .insert(leadPayments)
          .values({
            paymentId,
            leadId: id,
            couponCode: couponCode ?? null,
            offerRef: snapshot?.offerRef ?? null,
            customerName: snapshot?.nome ?? null,
            customerEmail: snapshot?.email ?? null,
            customerPhone: snapshot?.telefone ?? null,
            customerDocument: snapshot?.document ?? null,
          })
          .onConflictDoNothing({ target: leadPayments.paymentId })
      })
    },

    async couponForPayment(paymentId) {
      const [row] = await db
        .select({ couponCode: leadPayments.couponCode })
        .from(leadPayments)
        .where(eq(leadPayments.paymentId, paymentId))
        .limit(1)
      return row?.couponCode ?? null
    },

    async paymentContext(paymentId) {
      const [row] = await db
        .select({
          couponCode: leadPayments.couponCode,
          offerRef: leadPayments.offerRef,
          nome: leadPayments.customerName,
          email: leadPayments.customerEmail,
          telefone: leadPayments.customerPhone,
          document: leadPayments.customerDocument,
        })
        .from(leadPayments)
        .where(eq(leadPayments.paymentId, paymentId))
        .limit(1)
      return row ?? null
    },

    async markPaid(id, paidAt) {
      const rows = await db
        .update(leads)
        .set({ paidAt, updatedAt: new Date() })
        .where(sql`${leads.id} = ${id} and ${leads.paidAt} is null`)
        .returning({ id: leads.id })
      return rows.length > 0
    },

    async claimWelcome(id, at) {
      const rows = await db
        .update(leads)
        .set({ welcomeSentAt: at, updatedAt: new Date() })
        .where(sql`${leads.id} = ${id} and ${leads.welcomeSentAt} is null`)
        .returning({ id: leads.id })
      return rows.length > 0
    },

    async releaseWelcome(id) {
      await db
        .update(leads)
        .set({ welcomeSentAt: null, updatedAt: new Date() })
        .where(eq(leads.id, id))
    },

    async setMembersGranted(id, at) {
      await db
        .update(leads)
        .set({ membersGrantedAt: at, updatedAt: new Date() })
        .where(sql`${leads.id} = ${id} and ${leads.membersGrantedAt} is null`)
    },

    async setBuyerRegistration(id, buyerUserId, isNew, at) {
      await db
        .update(leads)
        .set({ buyerUserId, buyerIsNew: isNew, buyerRegisteredAt: at, updatedAt: new Date() })
        .where(sql`${leads.id} = ${id} and ${leads.buyerRegisteredAt} is null`)
    },

    async findLeadByPayment(paymentId) {
      const [row] = await db.select().from(leads).where(eq(leads.paymentId, paymentId)).limit(1)
      if (row) return row
      // Fallback: cobrança ANTIGA do lead (o ponteiro já foi sobrescrito por um
      // checkout mais novo) — resolve pelo histórico em lead_payments.
      const [mapped] = await db
        .select({ leadId: leadPayments.leadId })
        .from(leadPayments)
        .where(eq(leadPayments.paymentId, paymentId))
        .limit(1)
      if (!mapped) return null
      const [lead] = await db.select().from(leads).where(eq(leads.id, mapped.leadId)).limit(1)
      return lead ?? null
    },

    async insertEvent(leadId, eventName, step = null, metadata = null) {
      await db.insert(funnelEvents).values({ leadId, eventName, step, metadata })
    },

    async listLeads(limit, offset, filter) {
      const order = filter?.sort === 'asc' ? asc(leads.createdAt) : desc(leads.createdAt)
      const rows = await db
        .select()
        .from(leads)
        .where(leadWhere(filter))
        .orderBy(order)
        .limit(limit)
        .offset(offset)
      return rows
    },

    async countLeads(filter) {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(leads)
        .where(leadWhere(filter))
      return row?.n ?? 0
    },

    async eventCounts(funnel) {
      const cols = {
        eventName: funnelEvents.eventName,
        leads: sql<number>`count(distinct ${funnelEvents.leadId})::int`,
      }
      // Filtra por funil juntando ao lead de origem (funnel_events não guarda funil).
      if (funnel) {
        return db
          .select(cols)
          .from(funnelEvents)
          .innerJoin(leads, eq(funnelEvents.leadId, leads.id))
          .where(eq(leads.funnel, funnel))
          .groupBy(funnelEvents.eventName)
      }
      return db.select(cols).from(funnelEvents).groupBy(funnelEvents.eventName)
    },

    async perfilCounts(funnel) {
      const notNull = sql`${leads.perfilResultado} is not null`
      const where = funnel ? and(notNull, eq(leads.funnel, funnel)) : notNull
      const rows = await db
        .select({
          perfil: leads.perfilResultado,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .where(where)
        .groupBy(leads.perfilResultado)
      // O WHERE garante perfil não-nulo em runtime; estreita o tipo p/ a interface.
      return rows.map((r) => ({ perfil: r.perfil as string, count: r.count }))
    },

    async isWebhookProcessed(deliveryId) {
      const [row] = await db
        .select({ deliveryId: processedWebhooks.deliveryId })
        .from(processedWebhooks)
        .where(eq(processedWebhooks.deliveryId, deliveryId))
        .limit(1)
      return row != null
    },

    async markWebhookProcessed(deliveryId, paymentId) {
      const rows = await db
        .insert(processedWebhooks)
        .values({ deliveryId, paymentId })
        .onConflictDoNothing({ target: processedWebhooks.deliveryId })
        .returning({ deliveryId: processedWebhooks.deliveryId })
      return rows.length > 0
    },
  }
}
