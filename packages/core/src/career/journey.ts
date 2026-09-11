import { type CareerLevelSlug, careerLevelAtLeast } from './catalog'

export const AI_APPS_MIN_LEVEL: CareerLevelSlug = 'hacker'
export const FREE_CREATION_MIN_LEVEL: CareerLevelSlug = 'coder'
export const THREE_D_CREATION_MIN_LEVEL: CareerLevelSlug = 'explorer'

/**
 * As faixas de ferramentas do Molda por posto da carreira. O Molda não conhece carreira: o host
 * traduz o posto da criança numa lista de famílias liberadas e passa ao pacote.
 *
 * A régua é a mesma que pôs o Molda no Explorador(a): a oficina libera o que o Estúdio consegue
 * usar. Os três postos fecham os três cursos 3D (iniciante, intermediário, avançado), e o que se
 * mexe só toca no Jogo 3D Avançado, que chega no Arquiteto(a). Os nomes das faixas são o contrato
 * com o pacote (`MOLDA_TOOL_BANDS`, em `@sistemazero/molda/tools`); o kids confere os dois lados.
 */
export type MoldaToolBand = 'basic' | 'intermediate' | 'professional'
export const MOLDA_TOOL_BAND_LEVELS: Readonly<Record<MoldaToolBand, CareerLevelSlug>> = {
  basic: THREE_D_CREATION_MIN_LEVEL,
  intermediate: 'architect',
  professional: 'god',
}

export const CREATIVE_TOOL_LEVELS = {
  'estudio-completo': FREE_CREATION_MIN_LEVEL,
  pinta: FREE_CREATION_MIN_LEVEL,
  pensa: AI_APPS_MIN_LEVEL,
  molda: THREE_D_CREATION_MIN_LEVEL,
} as const
export type CreativeToolId = keyof typeof CREATIVE_TOOL_LEVELS
export type ToolAvailability = 'available' | 'career-locked' | 'not-included' | 'unavailable'

export interface ParentCareerView {
  level: CareerLevelSlug
  nextLevel: CareerLevelSlug | null
  pendingPublications: { courseSlug: string; title: string }[]
  tools: {
    id: CreativeToolId
    owned: boolean
    state: ToolAvailability
    requiredLevel: CareerLevelSlug
  }[]
}

/** Presentation and eligibility share this policy. Hosts still enforce access on every request. */
export function creativeToolAvailability(input: {
  tool: CreativeToolId
  owned: boolean | null
  level: string | null
  privileged?: boolean
}): ToolAvailability {
  if (input.privileged) return 'available'
  if (input.owned === null) return 'unavailable'
  if (!input.owned) return 'not-included'
  if (input.level === null) return 'unavailable'
  return careerLevelAtLeast(input.level, CREATIVE_TOOL_LEVELS[input.tool])
    ? 'available'
    : 'career-locked'
}

export interface CareerCourseMilestones {
  completed: boolean
  showcased: boolean
}

export interface JourneyCourse {
  careerSlot?: number | null
  careerLock?: { locked: boolean }
  milestones?: CareerCourseMilestones
  continueLessonId: string | null
  progress: { completedLessons: number; totalLessons: number }
}

export type CourseJourneyState =
  | 'locked'
  | 'content-unavailable'
  | 'publish'
  | 'continue'
  | 'start'
  | 'review'

/** Earned milestones are permanent; adding lessons or bonus courses cannot revoke them. */
export function careerCourseQualified(course: {
  careerSlot?: number | null
  milestones?: CareerCourseMilestones
}): boolean {
  return Boolean(
    course.milestones?.completed &&
      (typeof course.careerSlot !== 'number' || course.milestones.showcased),
  )
}

export function courseJourneyState(course: JourneyCourse): CourseJourneyState {
  if (course.careerLock?.locked) return 'locked'
  if (
    typeof course.careerSlot === 'number' &&
    course.milestones?.completed &&
    !course.milestones.showcased
  )
    return 'publish'
  if (course.progress.totalLessons === 0) return 'content-unavailable'
  if (course.progress.completedLessons >= course.progress.totalLessons) return 'review'
  return course.continueLessonId !== null || course.progress.completedLessons > 0
    ? 'continue'
    : 'start'
}

/** Server-ordered courses break ties; foundation publication is the first prerequisite. */
export function nextCareerCourse<T extends JourneyCourse>(courses: readonly T[]): T | null {
  const pending = courses.filter((course) => courseJourneyState(course) === 'publish')
  return (
    pending.find((course) => course.careerSlot === 1) ??
    pending[0] ??
    courses.find((course) => courseJourneyState(course) === 'continue') ??
    courses.find((course) => courseJourneyState(course) === 'start') ??
    null
  )
}
