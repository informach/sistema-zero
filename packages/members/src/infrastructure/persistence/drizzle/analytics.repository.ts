import { and, asc, count, countDistinct, eq, gte, ne } from 'drizzle-orm'
import type {
  AnalyticsRepository,
  CourseLessonCount,
  LessonFunnelRow,
} from '../../../domain/ports/analytics-repository.port'
import type { Database } from './db'
import { courses, lessonCompletions, lessons, modules } from './schema'

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: Database) {}

  async coursesWithLessonCounts(): Promise<CourseLessonCount[]> {
    // LEFT join em aulas publicadas → `count(lessons.id)` ignora o NULL do curso sem
    // aula (conta 0). Rascunho fica de fora (não há o que medir).
    const rows = await this.db
      .select({
        courseId: courses.id,
        courseRef: courses.slug,
        title: courses.title,
        audience: courses.audience,
        status: courses.status,
        publishedLessons: count(lessons.id),
      })
      .from(courses)
      .leftJoin(lessons, and(eq(lessons.courseId, courses.id), eq(lessons.isPublished, true)))
      .where(ne(courses.status, 'draft'))
      .groupBy(courses.id)
      .orderBy(asc(courses.title))
    return rows.map((r) => ({ ...r, publishedLessons: Number(r.publishedLessons) }))
  }

  async startedCountsByCourse(): Promise<Map<string, number>> {
    // Aprendiz "engajou" = concluiu ≥1 aula PUBLICADA do curso (distinct por usuário).
    const rows = await this.db
      .select({ courseId: lessonCompletions.courseId, c: countDistinct(lessonCompletions.userId) })
      .from(lessonCompletions)
      .innerJoin(
        lessons,
        and(eq(lessons.id, lessonCompletions.lessonId), eq(lessons.isPublished, true)),
      )
      .groupBy(lessonCompletions.courseId)
    return new Map(rows.map((r) => [r.courseId, Number(r.c)]))
  }

  async completedCountsByCourse(): Promise<Map<string, number>> {
    // Por (curso, aprendiz): quantas aulas publicadas concluiu.
    const comp = this.db
      .select({
        courseId: lessonCompletions.courseId,
        userId: lessonCompletions.userId,
        done: count().as('done'),
      })
      .from(lessonCompletions)
      .innerJoin(
        lessons,
        and(eq(lessons.id, lessonCompletions.lessonId), eq(lessons.isPublished, true)),
      )
      .groupBy(lessonCompletions.courseId, lessonCompletions.userId)
      .as('comp')
    // Total de aulas publicadas por curso.
    const pub = this.db
      .select({ courseId: lessons.courseId, total: count().as('total') })
      .from(lessons)
      .where(eq(lessons.isPublished, true))
      .groupBy(lessons.courseId)
      .as('pub')
    // Concluiu TUDO = done >= total (total>0 garantido pelo inner join).
    const rows = await this.db
      .select({ courseId: comp.courseId, c: countDistinct(comp.userId) })
      .from(comp)
      .innerJoin(pub, eq(pub.courseId, comp.courseId))
      .where(gte(comp.done, pub.total))
      .groupBy(comp.courseId)
    return new Map(rows.map((r) => [r.courseId, Number(r.c)]))
  }

  async lessonFunnel(courseId: string): Promise<LessonFunnelRow[]> {
    // innerJoin em `courses` NÃO-rascunho espelha o overview — funil de curso
    // rascunho/inexistente fica vazio (não há o que medir).
    const rows = await this.db
      .select({
        lessonId: lessons.id,
        title: lessons.title,
        moduleTitle: modules.title,
        completions: countDistinct(lessonCompletions.userId),
      })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .leftJoin(lessonCompletions, eq(lessonCompletions.lessonId, lessons.id))
      .where(
        and(
          eq(lessons.courseId, courseId),
          eq(lessons.isPublished, true),
          ne(courses.status, 'draft'),
        ),
      )
      .groupBy(lessons.id, modules.id)
      .orderBy(asc(modules.sortOrder), asc(lessons.sortOrder))
    return rows.map((r) => ({ ...r, completions: Number(r.completions) }))
  }

  async startedAndCompletedForCourse(
    courseId: string,
  ): Promise<{ started: number; completed: number }> {
    // Total de aulas publicadas do curso NÃO-rascunho (join em courses espelha o
    // overview). Rascunho/inexistente/sem aula → total 0 → 0/0 (sem mais queries).
    const totalRows = await this.db
      .select({ total: count() })
      .from(lessons)
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(
        and(
          eq(lessons.courseId, courseId),
          eq(lessons.isPublished, true),
          ne(courses.status, 'draft'),
        ),
      )
    const total = Number(totalRows[0]?.total ?? 0)
    if (total === 0) return { started: 0, completed: 0 }

    // `comp`: done por aprendiz = aulas publicadas DISTINTAS concluídas neste curso
    // (uniqueIndex (user,lesson) garante a distinção). Tudo filtrado por courseId.
    const comp = this.db
      .select({ userId: lessonCompletions.userId, done: count().as('done') })
      .from(lessonCompletions)
      .innerJoin(
        lessons,
        and(eq(lessons.id, lessonCompletions.lessonId), eq(lessons.isPublished, true)),
      )
      .where(eq(lessonCompletions.courseId, courseId))
      .groupBy(lessonCompletions.userId)
      .as('comp')
    const [startedRows, completedRows] = await Promise.all([
      // started = aprendizes com ≥1 aula publicada concluída neste curso.
      this.db
        .select({ c: countDistinct(lessonCompletions.userId) })
        .from(lessonCompletions)
        .innerJoin(
          lessons,
          and(eq(lessons.id, lessonCompletions.lessonId), eq(lessons.isPublished, true)),
        )
        .where(eq(lessonCompletions.courseId, courseId)),
      // completed = aprendizes com done >= total (concluíram TODAS as publicadas).
      this.db.select({ c: count() }).from(comp).where(gte(comp.done, total)),
    ])
    return {
      started: Number(startedRows[0]?.c ?? 0),
      completed: Number(completedRows[0]?.c ?? 0),
    }
  }
}
