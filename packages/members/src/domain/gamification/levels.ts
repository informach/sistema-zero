/**
 * Nível de longo prazo da criança, derivado dos slots obrigatórios da carreira
 * que têm os dois marcos: curso concluído + projeto publicado no Mural.
 */
import {
  CREATOR_JOURNEY_LEVELS,
  computeJourneyLevelSlug,
  creatorJourneyLevel,
  isJourneyCourseTier,
  JOURNEY_COURSE_TIERS,
  type JourneyCourseTier,
  type JourneyLevelSlug,
  missingJourneySlots,
} from '@sistemazero/core/journey'
import type { CourseTrack, JourneyCourseLevel } from '../course/course'

export const STUDENT_LEVEL_SLUGS = CREATOR_JOURNEY_LEVELS.map((level) => level.slug)
export type StudentLevelSlug = JourneyLevelSlug

export const COURSE_TIERS = JOURNEY_COURSE_TIERS
export type CourseTier = JourneyCourseTier

/**
 * O DEGRAU de um curso, ou `null` quando o par não é um degrau da carreira.
 *
 * ⚠️ Passou a devolver `null` em 14/08, com a chegada do `primeiros-passos`: nem toda
 * combinação (level, track) é degrau — só existe `primeiros-passos-2d`, nunca o `-3d`. O
 * `lenda` já ficava de fora por tipo. Quem chama trata `null` do mesmo jeito que trata
 * `lenda`: fora da carreira, sem trava.
 */
export function courseTier(level: JourneyCourseLevel, track: CourseTrack): CourseTier | null {
  const tier = `${level}-${track}`
  return isJourneyCourseTier(tier) ? tier : null
}

/** Slots qualificados por etapa. Arrays são tratados como conjuntos. */
export type QualifyingByTier = Record<CourseTier, number[]>

export function emptyQualifyingByTier(): QualifyingByTier {
  // Derivado do core: degrau novo entra sozinho, sem lista paralela para esquecer.
  return Object.fromEntries(
    COURSE_TIERS.map((tier) => [tier, [] as number[]]),
  ) as unknown as QualifyingByTier
}

/** Alias de compatibilidade para testes e auditorias do catálogo. */
export const STUDENT_LEVELS = CREATOR_JOURNEY_LEVELS.map((level) => ({
  slug: level.slug,
  tiers: level.requiredSlots,
}))

export type LevelRemaining = { any: number } & Record<CourseTier, number>

export interface StudentLevel {
  slug: StudentLevelSlug
  next: StudentLevelSlug | null
  remaining: LevelRemaining | null
}

function remainingFor(q: QualifyingByTier, nextSlug: StudentLevelSlug): LevelRemaining {
  const missing = missingJourneySlots(q, creatorJourneyLevel(nextSlug))
  const byTier = Object.fromEntries(
    COURSE_TIERS.map((tier) => [tier, missing[tier]?.length ?? 0]),
  ) as unknown as Record<CourseTier, number>
  return { any: 0, ...byTier }
}

export function computeStudentLevel(q: QualifyingByTier): StudentLevel {
  const slug = computeJourneyLevelSlug(q)
  const index = CREATOR_JOURNEY_LEVELS.findIndex((level) => level.slug === slug)
  const next = CREATOR_JOURNEY_LEVELS[index + 1]?.slug ?? null
  return { slug, next, remaining: next ? remainingFor(q, next) : null }
}
