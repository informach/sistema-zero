import type { CatalogAccessDurationUnit, CatalogOfferView } from '../server/catalog'
import type { PurchasedOfferSnapshotV1 } from '../server/purchased-offer-snapshot'

const SAO_PAULO = 'America/Sao_Paulo'

type FixedAccess = {
  accessMode: 'fixed'
  accessDurationValue: number
  accessDurationUnit: CatalogAccessDurationUnit
}

export function fixedAccessFromOffer(offer: CatalogOfferView | null): FixedAccess | null {
  if (offer?.accessMode !== 'fixed' || !offer.accessDurationValue || !offer.accessDurationUnit) {
    return null
  }
  return {
    accessMode: 'fixed',
    accessDurationValue: offer.accessDurationValue,
    accessDurationUnit: offer.accessDurationUnit,
  }
}

export function fixedAccessFromSnapshot(
  snapshot: PurchasedOfferSnapshotV1 | null,
): FixedAccess | null {
  if (
    snapshot?.accessMode !== 'fixed' ||
    !snapshot.accessDurationValue ||
    !snapshot.accessDurationUnit
  ) {
    return null
  }
  return {
    accessMode: 'fixed',
    accessDurationValue: snapshot.accessDurationValue,
    accessDurationUnit: snapshot.accessDurationUnit,
  }
}

/** Mesmo cálculo usado pelo members: dias = blocos de 24h; meses = calendário UTC. */
export function computeFixedAccessExpiry(start: Date, access: FixedAccess): Date {
  if (access.accessDurationUnit === 'days') {
    return new Date(start.getTime() + access.accessDurationValue * 86_400_000)
  }

  const months = start.getUTCFullYear() * 12 + start.getUTCMonth() + access.accessDurationValue
  const targetMonth = months % 12
  const targetYear = (months - targetMonth) / 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(start.getUTCDate(), lastDay),
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
      start.getUTCMilliseconds(),
    ),
  )
}

export function fixedAccessLabel(access: FixedAccess): string {
  const { accessDurationValue: value, accessDurationUnit: unit } = access
  if (unit === 'days') return `${value} ${value === 1 ? 'dia' : 'dias'}`
  return `${value} ${value === 1 ? 'mês' : 'meses'}`
}

export function formatSaoPauloDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatSaoPauloDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
