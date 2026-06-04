import { Elysia } from 'elysia'
import type { GetCourseProgressService } from '../../../application/get-course-progress/get-course-progress.service'
import type { GetLessonService } from '../../../application/get-lesson/get-lesson.service'
import type { GetMyCourseService } from '../../../application/get-my-course/get-my-course.service'
import type { ListMyCoursesService } from '../../../application/list-my-courses/list-my-courses.service'
import type { MarkLessonCompleteService } from '../../../application/mark-lesson-complete/mark-lesson-complete.service'
import type { SaveVideoPositionService } from '../../../application/save-video-position/save-video-position.service'
import { assertInternalCaller, resolveUserId } from '../auth'
import { VideoPositionBody } from '../dtos'

export interface MembersRoutesDeps {
  listMyCourses: ListMyCoursesService
  getMyCourse: GetMyCourseService
  getLesson: GetLessonService
  markComplete: MarkLessonCompleteService
  getProgress: GetCourseProgressService
  savePosition: SaveVideoPositionService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

/**
 * API de consumo do aluno. O `userId` vem do header `x-auth-user-id` (injetado
 * pelo gateway após verificar o JWT). Todo endpoint de conteúdo exige matrícula
 * ativa (403 sem vazar conteúdo) via `CheckAccessService` dentro dos casos de uso.
 * O `onBeforeHandle` confirma (em prod) que a chamada veio do gateway (token interno).
 */
export function membersRoutes(deps: MembersRoutesDeps) {
  return new Elysia({ prefix: '/members' })
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get('/courses', async ({ headers }) => {
      const userId = resolveUserId(headers)
      return { courses: await deps.listMyCourses.execute(userId) }
    })
    .get('/courses/:slug', async ({ headers, params }) => {
      const userId = resolveUserId(headers)
      return deps.getMyCourse.execute(userId, params.slug)
    })
    .get('/courses/:slug/progress', async ({ headers, params }) => {
      const userId = resolveUserId(headers)
      return deps.getProgress.execute(userId, params.slug)
    })
    .get('/courses/:slug/lessons/:lessonId', async ({ headers, params }) => {
      const userId = resolveUserId(headers)
      return deps.getLesson.execute(userId, params.slug, params.lessonId)
    })
    .post('/lessons/:lessonId/complete', async ({ headers, params }) => {
      const userId = resolveUserId(headers)
      return deps.markComplete.execute(userId, params.lessonId)
    })
    .put(
      '/courses/:slug/lessons/:lessonId/position',
      async ({ headers, params, body }) => {
        const userId = resolveUserId(headers)
        return deps.savePosition.execute(userId, params.slug, params.lessonId, body.positionSeconds)
      },
      { body: VideoPositionBody },
    )
}
