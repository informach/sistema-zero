import type { EventCount, FunnelRepo, Lead, LeadUpdate, PerfilCount } from '../../src/db/repo'

const matchesQuery = (l: Lead, term: string) =>
  (l.nome ?? '').toLowerCase().includes(term) || (l.email ?? '').toLowerCase().includes(term)

function baseLead(id: string): Lead {
  return {
    id,
    nome: null,
    email: null,
    telefone: null,
    document: null,
    quizAnswers: null,
    perfilResultado: null,
    funnel: null,
    lastStep: 'entrou_landing',
    paymentId: null,
    couponCode: null,
    offerRef: null,
    paidAt: null,
    buyerUserId: null,
    buyerIsNew: null,
    buyerRegisteredAt: null,
    welcomeSentAt: null,
    membersGrantedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export interface FakeRepoState {
  repo: FunnelRepo
  leads: Map<string, Lead>
  events: Array<{
    leadId: string
    eventName: string
    step: string | null
    metadata: Record<string, unknown> | null
  }>
  processed: Set<string>
  /** Histórico payment_id → { lead, cupom da cobrança } (espelha funil.lead_payments). */
  payments: Map<string, { leadId: string; couponCode: string | null }>
}

/** Implementação em memória do FunnelRepo para testes (sem Postgres). */
export function createFakeRepo(): FakeRepoState {
  const leads = new Map<string, Lead>()
  const events: FakeRepoState['events'] = []
  const processed = new Set<string>()
  const payments = new Map<string, { leadId: string; couponCode: string | null }>()
  let seq = 0

  const repo: FunnelRepo = {
    async createLead(funnel = null) {
      const id = `lead-${++seq}`
      leads.set(id, { ...baseLead(id), funnel: funnel ?? null })
      return { id }
    },
    async getLead(id) {
      return leads.get(id) ?? null
    },
    async updateLead(id, set: LeadUpdate) {
      const lead = leads.get(id)
      if (lead) leads.set(id, { ...lead, ...set, updatedAt: new Date() })
    },
    async mergeQuizAnswers(id, patch) {
      const lead = leads.get(id)
      if (lead) lead.quizAnswers = { ...(lead.quizAnswers ?? {}), ...patch }
    },
    async setPayment(id, paymentId, couponCode) {
      const lead = leads.get(id)
      if (lead) {
        lead.paymentId = paymentId
        // onConflictDoNothing: cobrança já registrada preserva o cupom original.
        if (!payments.has(paymentId)) {
          payments.set(paymentId, { leadId: id, couponCode: couponCode ?? null })
        }
      }
    },
    async couponForPayment(paymentId) {
      return payments.get(paymentId)?.couponCode ?? null
    },
    async markPaid(id, paidAt) {
      const lead = leads.get(id)
      if (lead && lead.paidAt == null) {
        lead.paidAt = paidAt
        return true
      }
      return false
    },
    async claimWelcome(id, at) {
      const lead = leads.get(id)
      if (lead && lead.welcomeSentAt == null) {
        lead.welcomeSentAt = at
        return true
      }
      return false
    },
    async releaseWelcome(id) {
      const lead = leads.get(id)
      if (lead) lead.welcomeSentAt = null
    },
    async setMembersGranted(id, at) {
      const lead = leads.get(id)
      if (lead && lead.membersGrantedAt == null) lead.membersGrantedAt = at
    },
    async setBuyerRegistration(id, buyerUserId, isNew, at) {
      const lead = leads.get(id)
      if (lead && lead.buyerRegisteredAt == null) {
        lead.buyerUserId = buyerUserId
        lead.buyerIsNew = isNew
        lead.buyerRegisteredAt = at
      }
    },
    async findLeadByPayment(paymentId) {
      for (const lead of leads.values()) if (lead.paymentId === paymentId) return lead
      // Fallback no histórico (cobrança antiga, ponteiro já sobrescrito).
      const mapped = payments.get(paymentId)
      return mapped ? (leads.get(mapped.leadId) ?? null) : null
    },
    async insertEvent(leadId, eventName, step = null, metadata = null) {
      events.push({ leadId, eventName, step, metadata })
    },
    async listLeads(limit, offset, filter) {
      let rows = [...leads.values()]
      if (filter?.funnel) rows = rows.filter((l) => l.funnel === filter.funnel)
      const q = filter?.q?.trim().toLowerCase()
      if (q) rows = rows.filter((l) => matchesQuery(l, q))
      rows.sort((a, b) =>
        filter?.sort === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      )
      return rows.slice(offset, offset + limit)
    },
    async countLeads(filter) {
      let rows = [...leads.values()]
      if (filter?.funnel) rows = rows.filter((l) => l.funnel === filter.funnel)
      const term = filter?.q?.trim().toLowerCase()
      if (term) rows = rows.filter((l) => matchesQuery(l, term))
      return rows.length
    },
    async eventCounts(funnel): Promise<EventCount[]> {
      const byName = new Map<string, Set<string>>()
      for (const e of events) {
        if (funnel && leads.get(e.leadId)?.funnel !== funnel) continue
        const set = byName.get(e.eventName) ?? new Set<string>()
        set.add(e.leadId)
        byName.set(e.eventName, set)
      }
      return [...byName].map(([eventName, set]) => ({ eventName, leads: set.size }))
    },
    async perfilCounts(funnel): Promise<PerfilCount[]> {
      const byPerfil = new Map<string, number>()
      for (const l of leads.values()) {
        if (l.perfilResultado == null) continue
        if (funnel && l.funnel !== funnel) continue
        byPerfil.set(l.perfilResultado, (byPerfil.get(l.perfilResultado) ?? 0) + 1)
      }
      return [...byPerfil].map(([perfil, count]) => ({ perfil, count }))
    },
    async isWebhookProcessed(deliveryId) {
      return processed.has(deliveryId)
    },
    async markWebhookProcessed(deliveryId) {
      if (processed.has(deliveryId)) return false
      processed.add(deliveryId)
      return true
    },
  }

  return { repo, leads, events, processed, payments }
}
