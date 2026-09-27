import type {
  EventCount,
  FunnelRepo,
  Lead,
  LeadUpdate,
  PaymentContext,
  PerfilCount,
  PriceCount,
} from '../../src/db/repo'
import { canonicalEventName } from '../../src/db/repo'

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
    attribution: null,
    lastStep: 'entrou_landing',
    paymentId: null,
    couponCode: null,
    offerRef: null,
    paidAt: null,
    subscriptionId: null,
    subscriptionIntervalMonths: null,
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
    eventKey: string | null
    timestamp: Date
  }>
  processed: Set<string>
  /** Histórico payment_id → contexto da cobrança (espelha funil.lead_payments). */
  payments: Map<string, { leadId: string; accessPeriodMonths: number | null } & PaymentContext>
}

/** Implementação em memória do FunnelRepo para testes (sem Postgres). */
export function createFakeRepo(): FakeRepoState {
  const leads = new Map<string, Lead>()
  const events: FakeRepoState['events'] = []
  const processed = new Set<string>()
  const payments = new Map<
    string,
    { leadId: string; accessPeriodMonths: number | null } & PaymentContext
  >()
  let seq = 0

  const repo: FunnelRepo = {
    async createLead(funnel = null, attribution = null) {
      const id = `lead-${++seq}`
      leads.set(id, { ...baseLead(id), funnel: funnel ?? null, attribution })
      return { id }
    },
    async getLead(id) {
      return leads.get(id) ?? null
    },
    async updateLead(id, set: LeadUpdate) {
      const lead = leads.get(id)
      if (lead) leads.set(id, { ...lead, ...set, updatedAt: new Date() })
    },
    async claimAttribution(id, attribution) {
      const lead = leads.get(id)
      if (lead && lead.attribution == null) lead.attribution = attribution
    },
    async mergeQuizAnswers(id, patch) {
      const lead = leads.get(id)
      if (lead) lead.quizAnswers = { ...(lead.quizAnswers ?? {}), ...patch }
    },
    async setPayment(id, paymentId, couponCode, snapshot) {
      const lead = leads.get(id)
      if (lead) {
        lead.paymentId = paymentId
        // onConflictDoNothing: cobrança já registrada preserva o cupom original.
        if (!payments.has(paymentId)) {
          payments.set(paymentId, {
            leadId: id,
            couponCode: couponCode ?? null,
            offerRef: snapshot?.offerRef ?? null,
            nome: snapshot?.nome ?? null,
            email: snapshot?.email ?? null,
            telefone: snapshot?.telefone ?? null,
            document: snapshot?.document ?? null,
            accessPeriodMonths: snapshot?.accessPeriodMonths ?? null,
            offerSnapshot: snapshot?.offerSnapshot ?? null,
          })
        }
      }
    },
    async couponForPayment(paymentId) {
      return payments.get(paymentId)?.couponCode ?? null
    },
    async setSubscription(id, subscriptionId, intervalMonths) {
      const lead = leads.get(id)
      if (lead) {
        lead.subscriptionId = subscriptionId
        lead.subscriptionIntervalMonths = intervalMonths
      }
    },
    async findLeadBySubscription(subscriptionId) {
      for (const lead of leads.values()) if (lead.subscriptionId === subscriptionId) return lead
      return null
    },
    async linkCyclePayment(leadId, paymentId) {
      if (!payments.has(paymentId)) {
        payments.set(paymentId, {
          leadId,
          couponCode: null,
          offerRef: null,
          nome: null,
          email: null,
          telefone: null,
          document: null,
          accessPeriodMonths: null,
          offerSnapshot: null,
        })
      }
    },
    async accessPeriodForPayment(paymentId) {
      return payments.get(paymentId)?.accessPeriodMonths ?? null
    },
    async paymentContext(paymentId) {
      const mapped = payments.get(paymentId)
      if (!mapped) return null
      const { couponCode, offerRef, nome, email, telefone, document, offerSnapshot } = mapped
      return { couponCode, offerRef, nome, email, telefone, document, offerSnapshot }
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
    async insertEvent(
      leadId,
      eventName,
      step = null,
      metadata = null,
      eventKey = null,
      occurredAt = new Date(),
    ) {
      if (eventKey && events.some((event) => event.eventKey === eventKey)) return
      const trusted = eventMetadata(leads.get(leadId), payments)
      events.push({
        leadId,
        eventName,
        step,
        metadata: { ...(metadata ?? {}), ...trusted },
        eventKey,
        timestamp: occurredAt,
      })
      const canonical = canonicalEventName(eventName)
      if (canonical && canonical !== eventName) {
        events.push({
          leadId,
          eventName: canonical,
          step,
          metadata: { ...(metadata ?? {}), ...trusted, source_event: eventName },
          eventKey: eventKey ? `${eventKey}:canonical` : null,
          timestamp: occurredAt,
        })
      }
    },
    async listLeads(limit, offset, filter) {
      let rows = [...leads.values()]
      if (filter?.funnel) rows = rows.filter((l) => l.funnel === filter.funnel)
      if (filter?.eventCode) {
        rows = rows.filter((l) => l.attribution?.eventCode === filter.eventCode)
      }
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
      if (filter?.eventCode) {
        rows = rows.filter((l) => l.attribution?.eventCode === filter.eventCode)
      }
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
    async attributedEventCounts(eventCode, funnel): Promise<EventCount[]> {
      const byName = new Map<string, Set<string>>()
      for (const event of events) {
        const lead = leads.get(event.leadId)
        if (lead?.attribution?.eventCode !== eventCode) continue
        if (funnel && lead.funnel !== funnel) continue
        const ids = byName.get(event.eventName) ?? new Set<string>()
        ids.add(event.leadId)
        byName.set(event.eventName, ids)
      }
      return [...byName].map(([eventName, ids]) => ({ eventName, leads: ids.size }))
    },
    async attributedPriceCounts(eventCode, funnel): Promise<PriceCount[]> {
      const byPrice = new Map<number, Set<string>>()
      for (const lead of leads.values()) {
        if (!lead.paidAt || lead.attribution?.eventCode !== eventCode) continue
        if (funnel && lead.funnel !== funnel) continue
        const snapshot = lead.paymentId ? payments.get(lead.paymentId)?.offerSnapshot : null
        const price = readChargedPrice(snapshot)
        if (price == null) continue
        const ids = byPrice.get(price) ?? new Set<string>()
        ids.add(lead.id)
        byPrice.set(price, ids)
      }
      return [...byPrice]
        .map(([chargedPriceCents, ids]) => ({ chargedPriceCents, leads: ids.size }))
        .sort((a, b) => a.chargedPriceCents - b.chargedPriceCents)
    },
    async insertBuyerLifecycleEvents(incoming) {
      let inserted = 0
      for (const item of incoming) {
        const target = [...leads.values()]
          .filter(
            (lead) =>
              lead.buyerUserId === item.buyerUserId &&
              lead.paidAt != null &&
              lead.offerRef?.startsWith('desafio-primeiro-jogo'),
          )
          .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0))[0]
        if (!target) continue
        const eventKey = `${target.id}:${item.eventName}`
        if (events.some((event) => event.eventKey === eventKey)) continue
        events.push({
          leadId: target.id,
          eventName: item.eventName,
          step: 'members',
          metadata: { source: 'members', ...eventMetadata(target, payments) },
          eventKey,
          timestamp: item.occurredAt,
        })
        inserted++
      }
      return inserted
    },
    async recordCommunitySubscription(sourceLeadId, buyerUserId) {
      const source = leads.get(sourceLeadId)
      if (!source?.offerRef?.includes('comunidade') || !source.paidAt) return
      const target = [...leads.values()]
        .filter(
          (lead) =>
            lead.buyerUserId === buyerUserId &&
            lead.paidAt != null &&
            lead.paidAt <= source.paidAt! &&
            lead.offerRef?.startsWith('desafio-primeiro-jogo'),
        )
        .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0))[0]
      if (!target) return
      const eventKey = `${target.id}:community_subscription_approved`
      if (events.some((event) => event.eventKey === eventKey)) return
      events.push({
        leadId: target.id,
        eventName: 'community_subscription_approved',
        step: 'continuity',
        metadata: { source: 'funnel', ...eventMetadata(target, payments) },
        eventKey,
        timestamp: new Date(),
      })
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

function readChargedPrice(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const value = (snapshot as { chargedPriceCents?: unknown }).chargedPriceCents
  return Number.isInteger(value) ? (value as number) : null
}

function eventMetadata(
  lead: Lead | undefined,
  payments: FakeRepoState['payments'],
): Record<string, unknown> {
  if (!lead) return {}
  const payment = lead.paymentId ? payments.get(lead.paymentId) : null
  const snapshot = payment?.offerSnapshot as { offerSlug?: string; couponCode?: string } | null
  return Object.fromEntries(
    Object.entries({
      funnel: lead.funnel,
      offer_slug: snapshot?.offerSlug ?? payment?.offerRef ?? lead.offerRef,
      coupon_code: snapshot?.couponCode ?? payment?.couponCode ?? lead.couponCode,
      event_code: lead.attribution?.eventCode,
      utm_source: lead.attribution?.utmSource,
      utm_medium: lead.attribution?.utmMedium,
      utm_campaign: lead.attribution?.utmCampaign,
    }).filter(([, value]) => value != null && value !== ''),
  )
}
