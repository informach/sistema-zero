import { desc, eq, sql } from 'drizzle-orm'
import type { Database } from './client'
import { funnelEvents, leads, processedWebhooks } from './schema'

export type Lead = typeof leads.$inferSelect
/** Colunas do lead que podem ser atualizadas via PATCH (contato + chaves do quiz). */
export type LeadUpdate = Partial<typeof leads.$inferInsert>

export interface EventCount {
  eventName: string
  leads: number
}

/**
 * Porta de persistência do funil. Os endpoints dependem desta interface; os testes
 * injetam um fake em memória (DI leve, no espírito do composition-root do payments).
 */
export interface FunnelRepo {
  createLead(): Promise<{ id: string }>
  getLead(id: string): Promise<Lead | null>
  updateLead(id: string, set: LeadUpdate): Promise<void>
  setPayment(id: string, paymentId: string): Promise<void>
  /** Marca pago se ainda não estava; retorna true se ESTA chamada foi a que pagou. */
  markPaid(id: string, paidAt: Date): Promise<boolean>
  /**
   * Marca o comprador como registrado no IdP (auth). Idempotente: só grava se
   * `buyer_registered_at` ainda for nulo (guarda contra corrida webhook × polling).
   * `buyerUserId` pode ser null (ex.: e-mail já existia → 409, sem id retornado).
   */
  setBuyerRegistration(id: string, buyerUserId: string | null, at: Date): Promise<void>
  findLeadByPayment(paymentId: string): Promise<Lead | null>
  insertEvent(leadId: string, eventName: string, step?: string | null): Promise<void>
  listLeads(limit: number, offset: number): Promise<Lead[]>
  countLeads(): Promise<number>
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

    async setPayment(id, paymentId) {
      await db.update(leads).set({ paymentId, updatedAt: new Date() }).where(eq(leads.id, id))
    },

    async markPaid(id, paidAt) {
      const rows = await db
        .update(leads)
        .set({ paidAt, updatedAt: new Date() })
        .where(sql`${leads.id} = ${id} and ${leads.paidAt} is null`)
        .returning({ id: leads.id })
      return rows.length > 0
    },

    async setBuyerRegistration(id, buyerUserId, at) {
      await db
        .update(leads)
        .set({ buyerUserId, buyerRegisteredAt: at, updatedAt: new Date() })
        .where(sql`${leads.id} = ${id} and ${leads.buyerRegisteredAt} is null`)
    },

    async findLeadByPayment(paymentId) {
      const [row] = await db.select().from(leads).where(eq(leads.paymentId, paymentId)).limit(1)
      return row ?? null
    },

    async insertEvent(leadId, eventName, step = null) {
      await db.insert(funnelEvents).values({ leadId, eventName, step })
    },

    async listLeads(limit, offset) {
      return db.select().from(leads).orderBy(desc(leads.createdAt)).limit(limit).offset(offset)
    },

    async countLeads() {
      const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(leads)
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
