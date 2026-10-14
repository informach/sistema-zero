import { and, eq, gt, isNull, lte, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  LiveLessonAccessPort,
  LiveOpenLesson,
} from '../../../domain/ports/live-lesson-access.port'
import type { Database } from './db'
import {
  courses,
  lessons,
  liveAccessGrants,
  liveCohorts,
  liveEnrollments,
  liveSessions,
} from './schema'

/**
 * O acesso ao curso ao vivo lido das tabelas das oficinas. As ligações com o curso moram no
 * documento (`live_cohorts.document->>'courseId'`, `live_sessions.document->>'lessonId'`) e
 * são comparadas como TEXTO (`id::text`), nunca com um `::uuid` que estouraria num documento
 * antigo ou malformado.
 *
 * Mesma régua do `LiveService.contextFor`: a vaga é da CONTA + perfil e precisa estar ativa, o
 * grant não pode estar revogado e a turma não pode estar em rascunho. O prazo é o do grant
 * (`starts_at <= agora < ends_at`, o `lessonAccess` do core).
 */
export class DrizzleLiveLessonAccessRepository implements LiveLessonAccessPort {
  constructor(private readonly db: Database) {}

  async openLessons(input: {
    accountId: string
    learnerId: string
    courseId: string
    now: Date
  }): Promise<LiveOpenLesson[]> {
    const rows = await this.db
      .select({ lessonId: lessons.id, endsAt: liveAccessGrants.endsAt })
      .from(liveAccessGrants)
      .innerJoin(liveEnrollments, eq(liveEnrollments.id, liveAccessGrants.enrollmentId))
      .innerJoin(liveSessions, eq(liveSessions.id, liveAccessGrants.sessionId))
      .innerJoin(liveCohorts, eq(liveCohorts.id, liveSessions.cohortId))
      .innerJoin(lessons, sql`${lessons.id}::text = ${liveSessions.document}->>'lessonId'`)
      .where(
        and(
          eq(liveEnrollments.accountId, input.accountId),
          eq(liveEnrollments.learnerId, input.learnerId),
          eq(liveEnrollments.status, 'active'),
          isNull(liveAccessGrants.revokedAt),
          lte(liveAccessGrants.startsAt, input.now),
          gt(liveAccessGrants.endsAt, input.now),
          sql`${liveCohorts.document}->>'status' <> 'draft'`,
          sql`${liveCohorts.document}->>'courseId' = ${input.courseId}`,
          eq(lessons.courseId, input.courseId),
        ),
      )
    // Uma aula pode ter mais de um grant ativo (reposição numa turma, ou duas turmas do mesmo
    // curso): vale o prazo mais longo.
    const byLesson = new Map<string, Date>()
    for (const row of rows) {
      const current = byLesson.get(row.lessonId)
      if (!current || row.endsAt > current) byLesson.set(row.lessonId, row.endsAt)
    }
    return [...byLesson].map(([lessonId, endsAt]) => ({ lessonId, endsAt }))
  }

  async isAssignedTeacher(input: { teacherId: string; courseId: string }): Promise<boolean> {
    const [row] = await this.db
      .select({ id: liveCohorts.id })
      .from(liveCohorts)
      .where(
        and(
          sql`${liveCohorts.document}->>'courseId' = ${input.courseId}`,
          sql`${liveCohorts.document}->'teacherIds' @> ${JSON.stringify([input.teacherId])}::jsonb`,
        ),
      )
      .limit(1)
    return row !== undefined
  }

  async hasActiveSeat(input: {
    accountId: string
    learnerId: string
    audience: CourseAudience
    now: Date
  }): Promise<boolean> {
    const [row] = await this.db
      .select({ id: liveEnrollments.id })
      .from(liveEnrollments)
      .innerJoin(liveAccessGrants, eq(liveAccessGrants.enrollmentId, liveEnrollments.id))
      .innerJoin(liveCohorts, eq(liveCohorts.id, liveEnrollments.cohortId))
      .innerJoin(courses, sql`${courses.id}::text = ${liveCohorts.document}->>'courseId'`)
      .where(
        and(
          eq(liveEnrollments.accountId, input.accountId),
          eq(liveEnrollments.learnerId, input.learnerId),
          eq(liveEnrollments.status, 'active'),
          isNull(liveAccessGrants.revokedAt),
          gt(liveAccessGrants.endsAt, input.now),
          sql`${liveCohorts.document}->>'status' in ('open', 'closed')`,
          eq(courses.audience, input.audience),
          eq(courses.modality, 'live'),
        ),
      )
      .limit(1)
    return row !== undefined
  }
}
