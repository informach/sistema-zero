import type { CourseAudience } from '../../src/domain/course/course'
import type {
  LiveLessonAccessPort,
  LiveOpenLesson,
} from '../../src/domain/ports/live-lesson-access.port'
import type { InMemoryCourseRepository } from './in-memory'

/** Um grant de uma aula de curso ao vivo, com o estado da vaga e da turma ao redor. */
export interface FakeLiveGrant {
  accountId: string
  learnerId: string
  courseId: string
  lessonId: string
  startsAt: Date
  endsAt: Date
  revoked?: boolean
  enrollmentStatus?: 'active' | 'revoked'
  cohortStatus?: 'draft' | 'open' | 'closed' | 'archived'
}

/**
 * Espelho em memória do `DrizzleLiveLessonAccessRepository`: mesma régua do grant ativo
 * (vaga ativa, não revogado, `startsAt <= agora < endsAt`, turma fora de rascunho). Semear um
 * grant registra a turma do curso no fake de cursos (a trava de trocar a modalidade).
 */
export class InMemoryLiveLessonAccess implements LiveLessonAccessPort {
  readonly grants: FakeLiveGrant[] = []
  readonly teachers: { teacherId: string; courseId: string }[] = []

  constructor(private readonly courses?: InMemoryCourseRepository) {}

  grant(input: FakeLiveGrant): void {
    this.grants.push(input)
    this.courses?.liveCohortCourseIds.add(input.courseId)
  }

  assignTeacher(teacherId: string, courseId: string): void {
    this.teachers.push({ teacherId, courseId })
    this.courses?.liveCohortCourseIds.add(courseId)
  }

  private active(grant: FakeLiveGrant, now: Date): boolean {
    return (
      (grant.enrollmentStatus ?? 'active') === 'active' &&
      !grant.revoked &&
      (grant.cohortStatus ?? 'open') !== 'draft' &&
      grant.startsAt <= now &&
      grant.endsAt > now
    )
  }

  async openLessons(input: {
    accountId: string
    learnerId: string
    courseId: string
    now: Date
  }): Promise<LiveOpenLesson[]> {
    const byLesson = new Map<string, Date>()
    for (const grant of this.grants) {
      if (
        grant.accountId !== input.accountId ||
        grant.learnerId !== input.learnerId ||
        grant.courseId !== input.courseId ||
        !this.active(grant, input.now)
      )
        continue
      const current = byLesson.get(grant.lessonId)
      if (!current || grant.endsAt > current) byLesson.set(grant.lessonId, grant.endsAt)
    }
    return [...byLesson].map(([lessonId, endsAt]) => ({ lessonId, endsAt }))
  }

  async isAssignedTeacher(input: { teacherId: string; courseId: string }): Promise<boolean> {
    return this.teachers.some(
      (item) => item.teacherId === input.teacherId && item.courseId === input.courseId,
    )
  }

  async hasActiveSeat(input: {
    accountId: string
    learnerId: string
    audience: CourseAudience
    now: Date
  }): Promise<boolean> {
    return this.grants.some((grant) => {
      const course = this.courses?.courses.find((item) => item.id === grant.courseId)
      return (
        grant.accountId === input.accountId &&
        grant.learnerId === input.learnerId &&
        (grant.enrollmentStatus ?? 'active') === 'active' &&
        !grant.revoked &&
        ['open', 'closed'].includes(grant.cohortStatus ?? 'open') &&
        grant.endsAt > input.now &&
        course?.modality === 'live' &&
        course.audience === input.audience
      )
    })
  }
}
