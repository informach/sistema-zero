/**
 * Espelho do `FulfillmentSpec` do catálogo (cópia local — a área de membros é dona
 * do seu domínio e não importa o pacote do catálogo). É o que vem em
 * `GET /catalog/offers/:slug/entitlements` por item e é congelado no snapshot da
 * matrícula.
 *
 * ⚠️ Union TOLERANTE de leitura: o catálogo só ESCREVE `course`, `all_courses` e
 * `all_kids_courses` (decisão 06/2026 — entrega exclusivamente via área de membros);
 * os demais valores permanecem aqui para snapshots/linhas legadas carregarem sem erro.
 * `all_courses` = chave-mestra ADULTA (todos os cursos `adult` publicados, atuais e
 * futuros); `all_kids_courses` = chave-mestra KIDS (todos os cursos `kids`) — cada uma
 * cobre SÓ a sua audiência (a checagem vira "chave do curso OU chave-mestra da audiência").
 */
export const ACCESS_TYPES = [
  'download',
  'course',
  'community',
  'external',
  'none',
  'all_courses',
  'all_kids_courses',
] as const
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
  /**
   * Teto de PERFIS (estilo Netflix) liberado por esta compra — plataforma KIDS. O
   * teto efetivo da conta é o MÁXIMO entre as matrículas kids ativas (ver
   * GetProfileAllowanceService). Ausente = sem teto por esta entrega (aplica-se o
   * default). Inteiro ≥ 1. Congelado no snapshot da matrícula no grant.
   */
  maxProfiles?: number
}
