/**
 * Etapas do pipeline de produção de conteúdo. PURO (unit-testado) — ESPELHO do
 * @sistemazero/marketing (`domain/content/stage.ts`); mudou lá, mude aqui.
 *
 * As etapas de PRODUÇÃO (idea..approved) são movidas MANUALMENTE pela equipe
 * (kanban/stepper) — qualquer direção, qualquer distância. `scheduled`/
 * `published` são DERIVADAS das publicações (o backend sincroniza) e NÃO
 * aceitam movimento manual; `canceled` é terminal (ação própria de cancelar).
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

/** Todas as etapas (produção + derivadas + terminal), p/ filtros e badges. */
export const CONTENT_STAGES = [
  ...PRODUCTION_STAGES,
  'scheduled',
  'published',
  'canceled',
] as const satisfies readonly ContentStage[]

const PRODUCTION_SET: ReadonlySet<ContentStage> = new Set(PRODUCTION_STAGES)

/** A etapa é de produção (movível manualmente)? */
export function isProductionStage(stage: ContentStage): stage is ProductionStage {
  return PRODUCTION_SET.has(stage)
}

/**
 * O movimento manual `from → to` é válido? Regras (mesmas do backend):
 * - ambos precisam ser etapas de produção (idea..approved);
 * - `scheduled`/`published`/`canceled` nunca se alcançam (nem se deixam) na mão;
 * - mover para a MESMA etapa é inválido (no-op vira aviso, não silêncio).
 * O gate de checklist ao entrar em `approved` é do backend (precisa de I/O).
 */
export function isValidManualMove(from: ContentStage, to: ContentStage): boolean {
  if (from === to) return false
  return isProductionStage(from) && isProductionStage(to)
}

/** Rótulos PT por etapa (colunas do kanban, badges e timeline). */
export const STAGE_LABELS: Record<ContentStage, string> = {
  idea: 'Ideia',
  script: 'Roteiro',
  recording: 'Gravação',
  editing: 'Edição',
  cover_caption: 'Capa e legenda',
  review: 'Revisão',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Publicado',
  canceled: 'Cancelado',
}

/** Classes de cor por etapa (tokens do tema — badges/colunas). */
export const STAGE_COLORS: Record<ContentStage, string> = {
  idea: 'bg-muted text-muted-foreground',
  script: 'bg-chart-1/15 text-chart-1',
  recording: 'bg-chart-4/15 text-chart-4',
  editing: 'bg-chart-3/15 text-chart-3',
  cover_caption: 'bg-chart-2/15 text-chart-2',
  review: 'bg-chart-5/15 text-chart-5',
  approved: 'bg-success/15 text-success-foreground',
  scheduled: 'bg-primary/15 text-primary',
  published: 'bg-success/15 text-success-foreground',
  canceled: 'bg-destructive/15 text-destructive',
}

// ── Tipos de conteúdo (o formato-mestre do card, não o da publicação) ──

export const CONTENT_TYPES = ['reels', 'video_long', 'carousel', 'static_post', 'story'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

/** Rótulos PT por tipo de conteúdo. */
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  reels: 'Reels',
  video_long: 'Vídeo longo',
  carousel: 'Carrossel',
  static_post: 'Post estático',
  story: 'Story',
}
