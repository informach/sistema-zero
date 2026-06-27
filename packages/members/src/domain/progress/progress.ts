import type { ModuleWithLessons } from '../course/course'

/** Progresso derivado de um curso (não materializado — calculado por agregação). */
export interface CourseProgress {
  completedLessons: number
  totalLessons: number
  /** 0–100, inteiro. Curso sem aulas → 0 (sem divisão por zero). */
  percent: number
}

export function computeProgress(completedLessons: number, totalLessons: number): CourseProgress {
  const completed = Math.max(0, Math.min(completedLessons, totalLessons))
  const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0
  return { completedLessons: completed, totalLessons, percent }
}

/**
 * Aula-alvo do CTA "Continuar de onde parou". Prioridade:
 * 1. última aula ACESSADA (posição de vídeo) ainda não concluída;
 * 2. primeira aula não concluída na ordem do outline;
 * 3. primeira aula do curso (tudo concluído → revisão do início);
 * 4. `null` se o curso não tem aulas.
 */
export function resolveContinueLesson(
  outline: ModuleWithLessons[],
  completedLessonIds: Set<string>,
  lastAccessedLessonId: string | null,
  lockedLessonIds: Set<string> = new Set(),
): string | null {
  const ordered = outline.flatMap((m) => m.lessons.map((l) => l.id))
  if (ordered.length === 0) return null
  if (
    lastAccessedLessonId &&
    ordered.includes(lastAccessedLessonId) &&
    !completedLessonIds.has(lastAccessedLessonId) &&
    !lockedLessonIds.has(lastAccessedLessonId)
  ) {
    return lastAccessedLessonId
  }
  return (
    ordered.find((id) => !completedLessonIds.has(id) && !lockedLessonIds.has(id)) ??
    ordered[0] ??
    null
  )
}
