import type { CourseLevelSlug, CourseTrack } from './types'

/**
 * A trilha da comunidade adulta (direção de arte de 18/10/2026): o eixo do curso (2D ou 3D) com os
 * níveis do catálogo. Puro, sem React: as páginas Cursos, Trilha, Curso e Início leem daqui.
 */
export const TRACKS: readonly CourseTrack[] = ['2d', '3d']

/** A ordem dos níveis na trilha; `lenda` é extra (fora da escada) e fecha a página. */
export const LEVEL_ORDER: readonly CourseLevelSlug[] = [
  'primeiros-passos',
  'iniciante',
  'intermediario',
  'avancado',
  'lenda',
]

const LEVEL_LABELS: Record<CourseLevelSlug, string> = {
  'primeiros-passos': 'Primeiros passos',
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  lenda: 'Extra',
}

const TRACK_LABELS: Record<CourseTrack, string> = { '2d': 'Jogos 2D', '3d': 'Jogos 3D' }

export function isTrack(value: string): value is CourseTrack {
  return (TRACKS as readonly string[]).includes(value)
}

/** Curso sem eixo (members antigo) é 2D, como no contrato. */
export function trackOf(course: { track?: CourseTrack | null }): CourseTrack {
  return course.track ?? '2d'
}

/** Curso sem nível (members antigo) entra como Iniciante. */
export function levelOf(course: { level?: CourseLevelSlug | null }): CourseLevelSlug {
  return course.level ?? 'iniciante'
}

export function levelLabel(level: CourseLevelSlug): string {
  return LEVEL_LABELS[level]
}

export function trackLabel(track: CourseTrack): string {
  return TRACK_LABELS[track]
}

/** "Jogos 2D · Iniciante", o sobretítulo dos cards de curso. */
export function courseKicker(course: {
  track?: CourseTrack | null
  level?: CourseLevelSlug | null
}): string {
  return `${trackLabel(trackOf(course))} · ${levelLabel(levelOf(course))}`
}

/**
 * Concluído pelo marco permanente OU por todas as aulas feitas: o marco não regride quando a
 * autora publica uma aula nova, e o progresso cobre o members que ainda não grava o marco.
 */
export function isCourseDone(course: {
  milestones?: { completed: boolean } | null
  progress?: { completedLessons: number; totalLessons: number } | null
}): boolean {
  if (course.milestones?.completed) return true
  const progress = course.progress
  return Boolean(
    progress && progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons,
  )
}

/** Os cursos agrupados por nível, na ordem da trilha, só os níveis que têm curso. */
export function groupByLevel<T extends { level?: CourseLevelSlug | null }>(
  courses: readonly T[],
): { level: CourseLevelSlug; courses: T[] }[] {
  return LEVEL_ORDER.map((level) => ({
    level,
    courses: courses.filter((course) => levelOf(course) === level),
  })).filter((group) => group.courses.length > 0)
}

/** "Bom dia", "Boa tarde" ou "Boa noite" pela hora de São Paulo. */
export function greetingFor(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('pt-BR', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Sao_Paulo',
    }).format(date),
  )
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export type LevelState = 'done' | 'current' | 'upcoming'

export interface TrackLevelSummary<T> {
  level: CourseLevelSlug
  courses: T[]
  done: number
  state: LevelState
}

export interface TrackSummary<T> {
  track: CourseTrack
  courses: T[]
  levels: TrackLevelSummary<T>[]
  done: number
  /**
   * Nível em que a pessoa está: o primeiro da escada com um curso DELA a concluir (curso fora do
   * acesso nunca decide o nível). `null` quando ela não tem curso a concluir na trilha.
   */
  currentLevel: CourseLevelSlug | null
  /** Todos os cursos da trilha concluídos. */
  finished: boolean
  /** Quantos cursos da trilha fazem parte do acesso da pessoa. */
  owned: number
}

/**
 * A trilha de um eixo: os cursos dele agrupados por nível, quantos estão concluídos em cada nível
 * e o nível atual. A Lenda (Extra) vem por último, então só vira o nível atual depois da escada.
 */
export function summarizeTrack<
  T extends {
    track?: CourseTrack | null
    level?: CourseLevelSlug | null
    milestones?: { completed: boolean } | null
    progress?: { completedLessons: number; totalLessons: number } | null
    /** Do catálogo: `false` = ainda não faz parte do acesso. Ausente conta como liberado. */
    hasAccess?: boolean | null
  },
>(courses: readonly T[], track: CourseTrack): TrackSummary<T> {
  const mine = courses.filter((course) => trackOf(course) === track)
  const groups = groupByLevel(mine).map((group) => ({
    ...group,
    done: group.courses.filter(isCourseDone).length,
  }))
  const owns = (course: T) => course.hasAccess !== false
  const current =
    groups.find((group) => group.courses.some((course) => owns(course) && !isCourseDone(course)))
      ?.level ?? null
  const levels = groups.map(
    (group): TrackLevelSummary<T> => ({
      ...group,
      state:
        group.done === group.courses.length
          ? 'done'
          : group.level === current
            ? 'current'
            : 'upcoming',
    }),
  )
  return {
    track,
    courses: mine,
    levels,
    done: levels.reduce((sum, group) => sum + group.done, 0),
    currentLevel: current,
    finished: levels.every((group) => group.state === 'done'),
    owned: mine.filter(owns).length,
  }
}

const NUMBER_WORDS = [
  'zero',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
]

/** "um curso", "quatro cursos", "12 cursos": a contagem por extenso até dez (masculino). */
export function countWords(count: number, singular: string, plural: string): string {
  return `${NUMBER_WORDS[count] ?? count} ${count === 1 ? singular : plural}`
}
