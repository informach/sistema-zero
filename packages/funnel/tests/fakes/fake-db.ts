import type { EventCount, FunnelRepo, Lead, LeadUpdate } from '../../src/db/repo'

function baseLead(id: string): Lead {
  return {
    id,
    nome: null,
    email: null,
    telefone: null,
    segmento: null,
    gastoTerceiros: null,
    formaDeCriar: null,
    jaQuebrou: null,
    nivelRefem: null,
    horasRetrabalho: null,
    valorHora: null,
    custoMensal: null,
    pesoPrincipal: null,
    visualizacao: null,
    oQueFalta: null,
    mudancaDesejada: null,
    lastStep: 'entrou_landing',
    paymentId: null,
    couponCode: null,
    offerRef: null,
    paidAt: null,
    buyerUserId: null,
    buyerIsNew: null,
    buyerRegisteredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export interface FakeRepoState {
  repo: FunnelRepo
  leads: Map<string, Lead>
  events: Array<{ leadId: string; eventName: string; step: string | null }>
  processed: Set<string>
}

/** Implementação em memória do FunnelRepo para testes (sem Postgres). */
export function createFakeRepo(): FakeRepoState {
  const leads = new Map<string, Lead>()
  const events: FakeRepoState['events'] = []
  const processed = new Set<string>()
  let seq = 0

  const repo: FunnelRepo = {
    async createLead() {
      const id = `lead-${++seq}`
      leads.set(id, baseLead(id))
      return { id }
    },
    async getLead(id) {
      return leads.get(id) ?? null
    },
    async updateLead(id, set: LeadUpdate) {
      const lead = leads.get(id)
      if (lead) leads.set(id, { ...lead, ...set, updatedAt: new Date() })
    },
    async setPayment(id, paymentId) {
      const lead = leads.get(id)
      if (lead) lead.paymentId = paymentId
    },
    async markPaid(id, paidAt) {
      const lead = leads.get(id)
      if (lead && lead.paidAt == null) {
        lead.paidAt = paidAt
        return true
      }
      return false
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
      return null
    },
    async insertEvent(leadId, eventName, step = null) {
      events.push({ leadId, eventName, step })
    },
    async listLeads(limit, offset) {
      return [...leads.values()].slice(offset, offset + limit)
    },
    async countLeads() {
      return leads.size
    },
    async eventCounts(): Promise<EventCount[]> {
      const byName = new Map<string, Set<string>>()
      for (const e of events) {
        const set = byName.get(e.eventName) ?? new Set<string>()
        set.add(e.leadId)
        byName.set(e.eventName, set)
      }
      return [...byName].map(([eventName, set]) => ({ eventName, leads: set.size }))
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

  return { repo, leads, events, processed }
}
