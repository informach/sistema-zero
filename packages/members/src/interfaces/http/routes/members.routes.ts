import { Elysia } from 'elysia'
import type { GetAttachmentDownloadService } from '../../../application/get-attachment-download/get-attachment-download.service'
import type { GetCourseProgressService } from '../../../application/get-course-progress/get-course-progress.service'
import type { GetLessonService } from '../../../application/get-lesson/get-lesson.service'
import type { GetMyCourseService } from '../../../application/get-my-course/get-my-course.service'
import type { ListCatalogService } from '../../../application/list-catalog/list-catalog.service'
import type { ListMyCoursesService } from '../../../application/list-my-courses/list-my-courses.service'
import type { MarkLessonCompleteService } from '../../../application/mark-lesson-complete/mark-lesson-complete.service'
import type { SaveVideoPositionService } from '../../../application/save-video-position/save-video-position.service'
import type { SubmitQuizAttemptService } from '../../../application/submit-quiz-attempt/submit-quiz-attempt.service'
import { assertInternalCaller, resolveUserId } from '../auth'
import { QuizAttemptBody, VideoPositionBody } from '../dtos'

export interface MembersRoutesDeps {
  listMyCourses: ListMyCoursesService
  listCatalog: ListCatalogService
  getMyCourse: GetMyCourseService
  getLesson: GetLessonService
  resolveAttachment: GetAttachmentDownloadService
  markComplete: MarkLessonCompleteService
  getProgress: GetCourseProgressService
  savePosition: SaveVideoPositionService
  submitQuiz: SubmitQuizAttemptService
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
  return (
    new Elysia({ prefix: '/members' })
      .onBeforeHandle(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      .get('/courses', async ({ headers }) => {
        const userId = resolveUserId(headers)
        return { courses: await deps.listMyCourses.execute(userId) }
      })
      // Catálogo "Todos os cursos" (published + flag hasAccess do aluno).
      .get('/catalog', async ({ headers }) => {
        const userId = resolveUserId(headers)
        return { courses: await deps.listCatalog.execute(userId) }
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
      // Resolução de download de anexo (consumida SÓ pelo servidor do community —
      // a `storageRef` devolvida nunca deve ser repassada ao browser).
      .get(
        '/courses/:slug/lessons/:lessonId/attachments/:attachmentId/resolve',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.resolveAttachment.execute(
            userId,
            params.slug,
            params.lessonId,
            params.attachmentId,
          )
        },
      )
      .post('/lessons/:lessonId/complete', async ({ headers, params }) => {
        const userId = resolveUserId(headers)
        return deps.markComplete.execute(userId, params.lessonId)
      })
      .put(
        '/courses/:slug/lessons/:lessonId/position',
        async ({ headers, params, body }) => {
          const userId = resolveUserId(headers)
          return deps.savePosition.execute(
            userId,
            params.slug,
            params.lessonId,
            body.positionSeconds,
          )
        },
        { body: VideoPositionBody },
      )
      // Submete o quiz: score no servidor; gabarito SÓ na resposta (nunca no GET).
      .post(
        '/lessons/:lessonId/blocks/:blockId/quiz-attempts',
        async ({ headers, params, body }) => {
          const userId = resolveUserId(headers)
          return deps.submitQuiz.execute(userId, params.lessonId, params.blockId, body.answers)
        },
        { body: QuizAttemptBody },
      )
  )
}
