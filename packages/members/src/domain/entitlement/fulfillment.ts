/**
 * Espelho do `FulfillmentSpec` do catálogo (cópia local — a área de membros é dona
 * do seu domínio e não importa o pacote do catálogo). É o que vem em
 * `GET /catalog/offers/:slug/entitlements` por item e é congelado no snapshot da
 * matrícula. `accessType` é o que cada feature (curso/comunidade/download) consome.
 */
export const ACCESS_TYPES = ['download', 'course', 'community', 'external', 'none'] as const
export type AccessType = (typeof ACCESS_TYPES)[number]

export function isAccessType(value: unknown): value is AccessType {
  return typeof value === 'string' && (ACCESS_TYPES as readonly string[]).includes(value)
}

export interface FulfillmentAsset {
  label: string
  url?: string
  ref?: string
}

export type ReleaseMode = 'immediate' | 'days_after_purchase' | 'fixed_date'

export interface ReleaseRule {
  mode: ReleaseMode
  days?: number
  date?: string
}

export interface FulfillmentSpec {
  accessType: AccessType
  assets?: FulfillmentAsset[]
  courseRef?: string
  release?: ReleaseRule
}
