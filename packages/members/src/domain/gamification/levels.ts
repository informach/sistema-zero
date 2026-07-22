/**
 * Nível de longo prazo da criança, derivado dos slots obrigatórios da carreira
 * que têm os dois marcos: curso concluído + projeto publicado no Mural.
 */
import {
  CAREER_COURSE_TIERS,
  type CareerCourseTier,
  type CareerLevelSlug,
  CREATOR_CAREER_LEVELS,
  computeCareerLevelSlug,
  creatorCareerLevel,
  missingCareerSlots,
} from '@sistemazero/core/career'
import type { CourseLevel, CourseTrack } from '../course/course'

export const STUDENT_LEVEL_SLUGS = CREATOR_CAREER_LEVELS.map((level) => level.slug)
export type StudentLevelSlug = CareerLevelSlug

export const COURSE_TIERS = CAREER_COURSE_TIERS
export type CourseTier = CareerCourseTier

export function courseTier(level: CourseLevel, track: CourseTrack): CourseTier {
  return `${level}-${track}`
}

/** Slots qualificados por etapa. Arrays são tratados como conjuntos. */
export type QualifyingByTier = Record<CourseTier, number[]>

export function emptyQualifyingByTier(): QualifyingByTier {
  return {
    'iniciante-2d': [],
    'iniciante-3d': [],
    'intermediario-2d': [],
    'intermediario-3d': [],
    'avancado-2d': [],
    'avancado-3d': [],
  }
}

/** Alias de compatibilidade para testes e auditorias do catálogo. */
export const STUDENT_LEVELS = CREATOR_CAREER_LEVELS.map((level) => ({
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
  const missing = missingCareerSlots(q, creatorCareerLevel(nextSlug))
  return {
    any: 0,
    'iniciante-2d': missing['iniciante-2d']?.length ?? 0,
    'iniciante-3d': missing['iniciante-3d']?.length ?? 0,
    'intermediario-2d': missing['intermediario-2d']?.length ?? 0,
    'intermediario-3d': missing['intermediario-3d']?.length ?? 0,
    'avancado-2d': missing['avancado-2d']?.length ?? 0,
    'avancado-3d': missing['avancado-3d']?.length ?? 0,
  }
}

export function computeStudentLevel(q: QualifyingByTier): StudentLevel {
  const slug = computeCareerLevelSlug(q)
  const index = CREATOR_CAREER_LEVELS.findIndex((level) => level.slug === slug)
  const next = CREATOR_CAREER_LEVELS[index + 1]?.slug ?? null
  return { slug, next, remaining: next ? remainingFor(q, next) : null }
}
