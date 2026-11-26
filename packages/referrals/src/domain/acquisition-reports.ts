import {
  ACQUISITION_ORIGIN_KINDS,
  type AcquisitionOriginKind,
  type AcquisitionView,
  type CourseBenefitContext,
  type OriginBreakdownRow,
  type OriginOfferRow,
  type OriginPathRow,
  type OriginPlaceRow,
  type OriginResults,
  type OriginWeekRow,
} from '@sistemazero/core/referrals'
import { saoPauloDayKey } from '@sistemazero/core/time'
import type { AcquisitionRecord } from './acquisition'

const DAY_MS = 86_400_000
/** "Assinou depois de entrar" conta até 45 dias da primeira entrada (o prazo do bônus). */
export const PATH_WINDOW_DAYS = 45

const active = (list: AcquisitionRecord[]) => list.filter((a) => a.status === 'active')
const sum = (list: AcquisitionRecord[]) => list.reduce((total, a) => total + a.amountCents, 0n)
const personKey = (a: Pick<AcquisitionRecord, 'email' | 'audience'>) => `${a.audience}|${a.email}`

/** O resultado de um conjunto de aquisições (uma campanha, um embaixador). Estornos não contam. */
export function originResults(list: AcquisitionRecord[]): OriginResults {
  const valid = active(list)
  return {
    people: new Set(valid.map(personKey)).size,
    gifts: valid.filter((a) => a.kind === 'gift').length,
    purchases: valid.filter((a) => a.kind === 'one_time').length,
    subscriptions: valid.filter((a) => a.kind === 'subscription').length,
    revenueCents: sum(valid).toString(),
  }
}

/** Oferta a oferta, da que mais trouxe para a que menos trouxe. */
export function resultsByOffer(list: AcquisitionRecord[]): OriginOfferRow[] {
  const rows = new Map<string, { row: OriginOfferRow; cents: bigint }>()
  for (const a of active(list)) {
    const key = `${a.kind}|${a.offerSlug ?? a.offerId ?? ''}`
    const entry = rows.get(key) ?? {
      row: { kind: a.kind, offerSlug: a.offerSlug, count: 0, revenueCents: '0' },
      cents: 0n,
    }
    entry.row.count++
    entry.cents += a.amountCents
    rows.set(key, entry)
  }
  return [...rows.values()]
    .map(({ row, cents }) => ({ ...row, revenueCents: cents.toString() }))
    .sort((a, b) => b.count - a.count)
}

/** A primeira aquisição de cada pessoa (no público), a partir de um histórico ordenado. */
export function firstByPerson(history: AcquisitionRecord[]): Map<string, AcquisitionRecord> {
  const first = new Map<string, AcquisitionRecord>()
  for (const a of active(history)) if (!first.has(personKey(a))) first.set(personKey(a), a)
  return first
}

export function breakdownByOrigin(
  period: AcquisitionRecord[],
  firsts: Map<string, AcquisitionRecord>,
  from: Date,
  to: Date,
): OriginBreakdownRow[] {
  return ACQUISITION_ORIGIN_KINDS.map((origin) => {
    const rows = active(period).filter((a) => a.originKind === origin)
    const newPeople = [...firsts.values()].filter(
      (f) => f.originKind === origin && f.acquiredAt >= from && f.acquiredAt < to,
    ).length
    return {
      origin,
      newPeople,
      gifts: rows.filter((a) => a.kind === 'gift').length,
      purchases: rows.filter((a) => a.kind === 'one_time').length,
      subscriptions: rows.filter((a) => a.kind === 'subscription').length,
      revenueCents: sum(rows).toString(),
    }
  })
}

/** A segunda-feira (Brasília) da semana do instante. */
export function weekStart(at: Date): string {
  const day = saoPauloDayKey(at)
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const utc = new Date(Date.UTC(y, m - 1, d))
  const weekday = (utc.getUTCDay() + 6) % 7 // segunda = 0
  return new Date(utc.getTime() - weekday * DAY_MS).toISOString().slice(0, 10)
}

export function revenueByWeek(period: AcquisitionRecord[]): OriginWeekRow[] {
  const weeks = new Map<string, Record<AcquisitionOriginKind, bigint>>()
  for (const a of active(period)) {
    const key = weekStart(a.acquiredAt)
    const row =
      weeks.get(key) ??
      (Object.fromEntries(ACQUISITION_ORIGIN_KINDS.map((o) => [o, 0n])) as Record<
        AcquisitionOriginKind,
        bigint
      >)
    row[a.originKind] += a.amountCents
    weeks.set(key, row)
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartKey, row]) => ({
      weekStart: weekStartKey,
      revenueByOrigin: Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v.toString()]),
      ) as Record<AcquisitionOriginKind, string>,
    }))
}

export function byPlace(period: AcquisitionRecord[]): OriginPlaceRow[] {
  const rows = new Map<string, { purchases: number; subscriptions: number; cents: bigint }>()
  for (const a of active(period)) {
    if (a.originKind !== 'platform' || !a.place) continue
    const row = rows.get(a.place) ?? { purchases: 0, subscriptions: 0, cents: 0n }
    if (a.kind === 'one_time') row.purchases++
    if (a.kind === 'subscription') row.subscriptions++
    row.cents += a.amountCents
    rows.set(a.place, row)
  }
  return [...rows.entries()]
    .map(([place, r]) => ({
      place,
      purchases: r.purchases,
      subscriptions: r.subscriptions,
      revenueCents: r.cents.toString(),
    }))
    .sort((a, b) => Number(BigInt(b.revenueCents) - BigInt(a.revenueCents)))
}

/**
 * O caminho até a assinatura, pela PRIMEIRA entrada de quem entrou no período: quantos assinaram
 * em até 45 dias e em quantos dias, em média. Quem já entrou assinando fica de fora (não há
 * caminho).
 */
export function pathsToSubscription(
  firsts: AcquisitionRecord[],
  history: AcquisitionRecord[],
): OriginPathRow[] {
  const rows = new Map<string, { row: OriginPathRow; days: number[] }>()
  for (const first of firsts) {
    if (first.kind === 'subscription') continue
    const key = `${first.kind}|${first.offerSlug ?? ''}`
    const entry = rows.get(key) ?? {
      row: {
        kind: first.kind,
        offerSlug: first.offerSlug,
        people: 0,
        subscribed: 0,
        averageDays: null,
      },
      days: [],
    }
    entry.row.people++
    const subscription = active(history).find(
      (a) =>
        a.kind === 'subscription' &&
        personKey(a) === personKey(first) &&
        a.acquiredAt >= first.acquiredAt &&
        a.acquiredAt.getTime() - first.acquiredAt.getTime() <= PATH_WINDOW_DAYS * DAY_MS,
    )
    if (subscription) {
      entry.row.subscribed++
      entry.days.push((subscription.acquiredAt.getTime() - first.acquiredAt.getTime()) / DAY_MS)
    }
    rows.set(key, entry)
  }
  return [...rows.values()]
    .map(({ row, days }) => ({
      ...row,
      averageDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    }))
    .sort((a, b) => b.people - a.people)
}

export function acquisitionView(
  a: AcquisitionRecord,
  names: {
    campaigns: Map<string, string>
    ambassadors: Map<string, string>
    benefits?: Map<string, CourseBenefitContext>
  },
  firstIds: Set<string>,
): AcquisitionView {
  return {
    ...(a.redemptionId && names.benefits?.has(a.redemptionId)
      ? { courseBenefit: names.benefits.get(a.redemptionId) }
      : {}),
    id: a.id,
    email: a.email,
    audience: a.audience,
    kind: a.kind,
    offerId: a.offerId,
    offerSlug: a.offerSlug,
    amountCents: a.amountCents.toString(),
    originKind: a.originKind,
    campaignId: a.campaignId,
    campaignTitle: a.campaignId ? (names.campaigns.get(a.campaignId) ?? null) : null,
    ambassadorId: a.ambassadorId,
    ambassadorName: a.ambassadorId ? (names.ambassadors.get(a.ambassadorId) ?? null) : null,
    accountUserId: a.accountUserId,
    place: a.place,
    utmSource: a.utm?.utmSource ?? null,
    status: a.status,
    acquiredAt: a.acquiredAt.toISOString(),
    firstEntry: firstIds.has(a.id),
  }
}
