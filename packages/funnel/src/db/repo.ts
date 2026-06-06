import { asc, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import type { Database } from './client'
import { funnelEvents, leadPayments, leads, processedWebhooks } from './schema'

export type Lead = typeof leads.$inferSelect
/** Colunas do lead que podem ser atualizadas via PATCH (contato + chaves do quiz). */
export type LeadUpdate = Partial<typeof leads.$inferInsert>

export interface EventCount {
  eventName: string
  leads: number
}

/** Filtro/ordenação da listagem de leads (busca por nome/e-mail + data). */
export interface LeadFilter {
  /** Busca case-insensitive em nome OU e-mail. */
  q?: string
  /** Ordem por `created_at` (default `desc` = mais recentes primeiro). */
  sort?: 'asc' | 'desc'
}

/**
 * Escapa os curingas do LIKE/ILIKE (`%`, `_` e o próprio `\`) para que a busca
 * trate o termo como literal — sem isto, `%` no input vira "casa tudo" e `_`
 * vira "qualquer char" (padrão do monorepo; espelha o escapeLike do catalog).
 */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** WHERE compartilhado por `listLeads`/`countLeads` (mesma busca → mesmo total). */
function leadSearchWhere(q?: string): SQL | undefined {
  const term = q?.trim()
  if (!term) return undefined
  const like = `%${escapeLike(term)}%`
  return or(ilike(leads.nome, like), ilike(leads.email, like))
}

/**
 * Porta de persistência do funil. Os endpoints dependem desta interface; os testes
 * injetam um fake em memória (DI leve, no espírito do composition-root do payments).
 */
export interface FunnelRepo {
  createLead(): Promise<{ id: string }>
  getLead(id: string): Promise<Lead | null>
  updateLead(id: string, set: LeadUpdate): Promise<void>
  /**
   * Aponta o lead p/ a cobrança + grava o par no histórico (`lead_payments`),
   * com o cupom aplicado NESTA cobrança (o redeem da confirmação lê de lá).
   * `couponCode` ausente (re-aponte do webhook) não sobrescreve o histórico.
   */
  setPayment(id: string, paymentId: string, couponCode?: string | null): Promise<void>
  /** Cupom aplicado na cobrança (histórico `lead_payments`); null = sem cupom. */
  couponForPayment(paymentId: string): Promise<string | null>
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
  insertEvent(leadId: string, eventName: string, step?: string | null): Promise<void>
  listLeads(limit: number, offset: number, filter?: LeadFilter): Promise<Lead[]>
  countLeads(q?: string): Promise<number>
  eventCounts(): Promise<EventCount[]>
  /** True se o delivery id já foi processado (dedupe de webhook). */
  isWebhookProcessed(deliveryId: string): Promise<boolean>
  /** Insere o delivery id; retorna false se já existia (webhook duplicado). */
  markWebhookProcessed(deliveryId: string, paymentId: string | null): Promise<boolean>
}

export function createFunnelRepo(db: Database): FunnelRepo {
  return {
    async createLead() {
      const [row] = await db.insert(leads).values({}).returning({ id: leads.id })
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

    async setPayment(id, paymentId, couponCode) {
      // Além do ponteiro "cobrança atual" no lead, grava o HISTÓRICO em
      // lead_payments (com o cupom DESTA cobrança) — uma cobrança antiga ainda
      // pagável (boleto/Pix re-gerado) precisa continuar resolvendo o lead no
      // webhook (findLeadByPayment) e redimir o cupom certo na confirmação.
      await db.transaction(async (tx) => {
        await tx.update(leads).set({ paymentId, updatedAt: new Date() }).where(eq(leads.id, id))
        await tx
          .insert(leadPayments)
          .values({ paymentId, leadId: id, couponCode: couponCode ?? null })
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

    async insertEvent(leadId, eventName, step = null) {
      await db.insert(funnelEvents).values({ leadId, eventName, step })
    },

    async listLeads(limit, offset, filter) {
      const order = filter?.sort === 'asc' ? asc(leads.createdAt) : desc(leads.createdAt)
      return db
        .select()
        .from(leads)
        .where(leadSearchWhere(filter?.q))
        .orderBy(order)
        .limit(limit)
        .offset(offset)
    },

    async countLeads(q) {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(leads)
        .where(leadSearchWhere(q))
      return row?.n ?? 0
    },

    async eventCounts() {
      return db
        .select({
          eventName: funnelEvents.eventName,
          leads: sql<number>`count(distinct ${funnelEvents.leadId})::int`,
        })
        .from(funnelEvents)
        .groupBy(funnelEvents.eventName)
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
