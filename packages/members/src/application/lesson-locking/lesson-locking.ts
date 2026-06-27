import type { Course } from '../../domain/course/course'
import { LessonLockedError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import { isLessonLocked, lockedLessonIds } from '../../domain/progress/locking'

export interface LessonLockState {
  completedLessonIds: string[]
  orderedPublishedLessonIds: string[]
}

export function assertLessonUnlockedFromState(
  course: Course,
  lessonId: string,
  state: LessonLockState,
  privileged: boolean,
): void {
  if (privileged || !course.sequentialLock) return
  if (isLessonLocked(state.orderedPublishedLessonIds, lessonId, state.completedLessonIds)) {
    throw new LessonLockedError()
  }
}

export async function resolveLessonLockState(
  courses: CourseRepository,
  progress: ProgressRepository,
  userId: string,
  courseId: string,
): Promise<LessonLockState> {
  const [completedLessonIds, outline] = await Promise.all([
    progress.listCompletedLessonIds(userId, courseId),
    courses.findOutline(courseId, { publishedOnly: true }),
  ])
  return {
    completedLessonIds,
    orderedPublishedLessonIds: outline.flatMap((m) => m.lessons.map((l) => l.id)),
  }
}

export async function assertLessonUnlocked(
  courses: CourseRepository,
  progress: ProgressRepository,
  course: Course,
  lessonId: string,
  userId: string,
  privileged: boolean,
): Promise<LessonLockState> {
  // Curto-circuito ANTES das 2 leituras (completed + outline): equipe (privileged)
  // e curso com a trava desligada nunca travam. Sem isto, caminhos quentes que só
  // CHAMAM o assert (save-position, quiz, studio, anexo/ebook resolve) pagavam as
  // queries à toa. Todos os chamadores descartam o retorno, então o estado vazio
  // aqui é inócuo (o gate só roda quando há trava real a aplicar).
  if (privileged || !course.sequentialLock) {
    return { completedLessonIds: [], orderedPublishedLessonIds: [] }
  }
  const state = await resolveLessonLockState(courses, progress, userId, course.id)
  assertLessonUnlockedFromState(course, lessonId, state, privileged)
  return state
}

export function lockedLessonSetForCourse(
  course: Course,
  orderedPublishedLessonIds: string[],
  completedLessonIds: Iterable<string>,
  privileged: boolean,
): Set<string> {
  return privileged || !course.sequentialLock
    ? new Set<string>()
    : lockedLessonIds(orderedPublishedLessonIds, completedLessonIds)
}
