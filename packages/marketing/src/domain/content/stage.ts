/**
 * Etapas do pipeline de produção de conteúdo. PURO (testável sem framework).
 *
 * As etapas de PRODUÇÃO (idea..approved) são movidas MANUALMENTE pela equipe
 * (kanban/stepper) — qualquer direção, qualquer distância (o kanban permite
 * arrastar entre colunas não adjacentes). `scheduled`/`published` são DERIVADAS
 * das publicações do conteúdo (o service sincroniza) e NÃO aceitam movimento
 * manual; `canceled` é terminal (via ação própria de cancelar).
 */
export type ContentStage =
  | 'idea'
  | 'script'
  | 'recording'
  | 'editing'
  | 'cover_caption'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'canceled'

/** Etapas de produção, na ordem do pipeline (colunas do kanban). */
export const PRODUCTION_STAGES = [
  'idea',
  'script',
  'recording',
  'editing',
  'cover_caption',
  'review',
  'approved',
] as const

export type ProductionStage = (typeof PRODUCTION_STAGES)[number]

/** Todas as etapas (produção + derivadas + terminal) — base de contagens/labels. */
export const ALL_STAGES = [...PRODUCTION_STAGES, 'scheduled', 'published', 'canceled'] as const

const PRODUCTION_SET: ReadonlySet<ContentStage> = new Set(PRODUCTION_STAGES)

/** A etapa é de produção (movível manualmente)? */
export function isProductionStage(stage: ContentStage): stage is ProductionStage {
  return PRODUCTION_SET.has(stage)
}

/**
 * O movimento manual `from → to` é válido? Regras:
 * - ambos precisam ser etapas de produção (idea..approved);
 * - `scheduled`/`published`/`canceled` nunca se alcançam (nem se deixam) na mão;
 * - mover para a MESMA etapa é inválido (no-op vira 409, não silêncio).
 * O gate de checklist ao entrar em `approved` é do SERVICE (precisa de I/O).
 */
export function isValidManualMove(from: ContentStage, to: ContentStage): boolean {
  if (from === to) return false
  return isProductionStage(from) && isProductionStage(to)
}

/** O conteúdo pode ser cancelado neste estado? (published é imutável) */
export function canCancel(stage: ContentStage): boolean {
  return stage !== 'published' && stage !== 'canceled'
}

/** O conteúdo pode gerar publicações neste estado? */
export function canCreatePublications(stage: ContentStage): boolean {
  return stage === 'approved' || stage === 'scheduled' || stage === 'published'
}
