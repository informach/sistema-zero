import type { CourseAudience } from '../../domain/course/course'
import type { AnalyticsRepository } from '../../domain/ports/analytics-repository.port'

/** Linha do overview de analytics de um curso. */
export interface CourseAnalyticsView {
  courseId: string
  courseRef: string
  title: string
  audience: CourseAudience
  status: string
  publishedLessons: number
  /** Aprendizes que concluíram ≥1 aula publicada (engajaram). */
  started: number
  /** Aprendizes que concluíram TODAS as aulas publicadas. */
  completed: number
  /** % de conclusão entre os que engajaram (`completed/started`); 0 se ninguém engajou. */
  completionRate: number
}

/** Uma aula no funil + conclusões distintas (a "queda" entre aulas é derivada no front). */
export interface LessonFunnelView {
  lessonId: string
  title: string
  moduleTitle: string
  completions: number
}

export interface CourseFunnelView {
  courseId: string
  started: number
  completed: number
  lessons: LessonFunnelView[]
}

function rate(completed: number, started: number): number {
  return started > 0 ? Math.round((completed / started) * 100) : 0
}

/** Analytics de aprendizado (admin): overview por curso + funil por aula. Read-only. */
export class GetCourseAnalyticsService {
  constructor(private readonly analytics: AnalyticsRepository) {}

  async overview(): Promise<{ courses: CourseAnalyticsView[] }> {
    const [courses, started, completed] = await Promise.all([
      this.analytics.coursesWithLessonCounts(),
      this.analytics.startedCountsByCourse(),
      this.analytics.completedCountsByCourse(),
    ])
    return {
      courses: courses.map((c) => {
        const s = started.get(c.courseId) ?? 0
        const done = completed.get(c.courseId) ?? 0
        return {
          courseId: c.courseId,
          courseRef: c.courseRef,
          title: c.title,
          audience: c.audience,
          status: c.status,
          publishedLessons: c.publishedLessons,
          started: s,
          completed: done,
          completionRate: rate(done, s),
        }
      }),
    }
  }

  async funnel(courseId: string): Promise<CourseFunnelView> {
    // started/completed por-curso (filtrado por courseId) em vez de recomputar os
    // mapas globais de todos os cursos só p/ extrair um — ver overview() p/ o global.
    const [lessons, totals] = await Promise.all([
      this.analytics.lessonFunnel(courseId),
      this.analytics.startedAndCompletedForCourse(courseId),
    ])
    return {
      courseId,
      started: totals.started,
      completed: totals.completed,
      lessons: lessons.map((l) => ({
        lessonId: l.lessonId,
        title: l.title,
        moduleTitle: l.moduleTitle,
        completions: l.completions,
      })),
    }
  }
}
