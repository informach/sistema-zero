import type { CourseLevelSlug, CourseTrack } from './types'

/**
 * DEGRAU pedagógico do curso = dificuldade × eixo 2D/3D (reforma 07/2026).
 * A ordem do array é a escada que a carreira sobe (2D antes de 3D em cada
 * dificuldade) — a MESMA do `BlockLevel` do studio e dos `COURSE_TIERS` do
 * members. Helper compartilhado dos apps de aluno (kids/community); o admin
 * NÃO importa daqui (duplicação intencional, como os rank labels).
 */
export const COURSE_TIERS = [
  'iniciante-2d',
  'iniciante-3d',
  'intermediario-2d',
  'intermediario-3d',
  'avancado-2d',
  'avancado-3d',
] as const
export type CourseTierSlug = (typeof COURSE_TIERS)[number]

/** Rótulos de exibição dos degraus (chips, filtros). */
export const COURSE_TIER_LABELS: Record<CourseTierSlug, string> = {
  'iniciante-2d': 'Iniciante 2D',
  'iniciante-3d': 'Iniciante 3D',
  'intermediario-2d': 'Intermediário 2D',
  'intermediario-3d': 'Intermediário 3D',
  'avancado-2d': 'Avançado 2D',
  'avancado-3d': 'Avançado 3D',
}

/**
 * Degrau do par (dificuldade, eixo) vindo das views do members. `track` ausente
 * (members antigo) → `2d` (o default da coluna); `level` ausente → undefined
 * (curso sem dificuldade não tem chip/filtro).
 */
export function courseTierOf(
  level?: CourseLevelSlug,
  track?: CourseTrack,
): CourseTierSlug | undefined {
  // `lenda` é FORA da carreira → não é degrau (sem chip/filtro de degrau; o kids
  // renderiza o rótulo "Lenda" à parte).
  if (!level || level === 'lenda') return undefined
  return `${level}-${track ?? '2d'}`
}
