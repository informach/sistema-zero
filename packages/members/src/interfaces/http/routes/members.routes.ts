import { Elysia } from 'elysia'
import type { GetAttachmentDownloadService } from '../../../application/get-attachment-download/get-attachment-download.service'
import type { GetCourseProgressService } from '../../../application/get-course-progress/get-course-progress.service'
import type { GetCourseRatingService } from '../../../application/get-course-rating/get-course-rating.service'
import type { GetEbookDownloadService } from '../../../application/get-ebook-download/get-ebook-download.service'
import type { GetLessonService } from '../../../application/get-lesson/get-lesson.service'
import type { GetMyCourseService } from '../../../application/get-my-course/get-my-course.service'
import type { ListCatalogService } from '../../../application/list-catalog/list-catalog.service'
import type { ListMyCoursesService } from '../../../application/list-my-courses/list-my-courses.service'
import type { MarkLessonCompleteService } from '../../../application/mark-lesson-complete/mark-lesson-complete.service'
import type { SaveCourseRatingService } from '../../../application/save-course-rating/save-course-rating.service'
import type { SaveVideoPositionService } from '../../../application/save-video-position/save-video-position.service'
import type { SubmitQuizAttemptService } from '../../../application/submit-quiz-attempt/submit-quiz-attempt.service'
import { assertInternalCaller, isPrivilegedActor, resolveUserId } from '../auth'
import {
  AttachmentResolveParams,
  CourseRatingBody,
  EbookResolveParams,
  LessonIdParams,
  QuizAttemptBody,
  QuizAttemptParams,
  SlugLessonParams,
  VideoPositionBody,
} from '../dtos'

export interface MembersRoutesDeps {
  listMyCourses: ListMyCoursesService
  listCatalog: ListCatalogService
  getMyCourse: GetMyCourseService
  getLesson: GetLessonService
  resolveAttachment: GetAttachmentDownloadService
  resolveEbook: GetEbookDownloadService
  markComplete: MarkLessonCompleteService
  getProgress: GetCourseProgressService
  savePosition: SaveVideoPositionService
  submitQuiz: SubmitQuizAttemptService
  getCourseRating: GetCourseRatingService
  saveCourseRating: SaveCourseRatingService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

/**
 * API de consumo do aluno. O `userId` vem do header `x-auth-user-id` (injetado
 * pelo gateway após verificar o JWT). Todo endpoint de conteúdo exige matrícula
 * ativa (403 sem vazar conteúdo) via `CheckAccessService` dentro dos casos de uso —
 * EXCETO equipe interna (`isPrivilegedActor`): superadmin/admin/staff navegam tudo
 * com chave-mestra virtual (rascunho continua 404, igual ao aluno com `all_courses`).
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
        return { courses: await deps.listMyCourses.execute(userId, isPrivilegedActor(headers)) }
      })
      // Catálogo "Todos os cursos" (published + flag hasAccess do aluno).
      .get('/catalog', async ({ headers }) => {
        const userId = resolveUserId(headers)
        return { courses: await deps.listCatalog.execute(userId, isPrivilegedActor(headers)) }
      })
      .get('/courses/:slug', async ({ headers, params }) => {
        const userId = resolveUserId(headers)
        return deps.getMyCourse.execute(userId, params.slug, isPrivilegedActor(headers))
      })
      .get('/courses/:slug/progress', async ({ headers, params }) => {
        const userId = resolveUserId(headers)
        return deps.getProgress.execute(userId, params.slug, isPrivilegedActor(headers))
      })
      // Classificação do curso (1 por aluno+curso; ver SaveCourseRatingService).
      .get('/courses/:slug/rating', async ({ headers, params }) => {
        const userId = resolveUserId(headers)
        return {
          rating: await deps.getCourseRating.execute(
            userId,
            params.slug,
            isPrivilegedActor(headers),
          ),
        }
      })
      .put(
        '/courses/:slug/rating',
        async ({ headers, params, body }) => {
          const userId = resolveUserId(headers)
          return deps.saveCourseRating.execute(
            userId,
            params.slug,
            {
              // Conversão nota↔ratingHalf SÓ aqui (entrada) e no mapper (saída).
              ratingHalf: body.rating * 2,
              comment: body.comment ?? null,
              feedbackAnswers: body.feedbackAnswers ?? null,
            },
            isPrivilegedActor(headers),
          )
        },
        { body: CourseRatingBody },
      )
      .get(
        '/courses/:slug/lessons/:lessonId',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.getLesson.execute(
            userId,
            params.slug,
            params.lessonId,
            isPrivilegedActor(headers),
          )
        },
        { params: SlugLessonParams },
      )
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
            isPrivilegedActor(headers),
          )
        },
        { params: AttachmentResolveParams },
      )
      // Resolução do PDF do bloco e-book (mesmo perfil do resolve de anexo:
      // consumida SÓ pelo servidor do community; storageRef nunca vai ao browser).
      .get(
        '/courses/:slug/lessons/:lessonId/blocks/:blockId/ebook/resolve',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.resolveEbook.execute(
            userId,
            params.slug,
            params.lessonId,
            params.blockId,
            isPrivilegedActor(headers),
          )
        },
        { params: EbookResolveParams },
      )
      .post(
        '/lessons/:lessonId/complete',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.markComplete.execute(userId, params.lessonId, isPrivilegedActor(headers))
        },
        { params: LessonIdParams },
      )
      .put(
        '/courses/:slug/lessons/:lessonId/position',
        async ({ headers, params, body }) => {
          const userId = resolveUserId(headers)
          return deps.savePosition.execute(
            userId,
            params.slug,
            params.lessonId,
            body.positionSeconds,
            isPrivilegedActor(headers),
          )
        },
        { body: VideoPositionBody, params: SlugLessonParams },
      )
      // Submete o quiz: score no servidor; gabarito SÓ na resposta (nunca no GET).
      .post(
        '/lessons/:lessonId/blocks/:blockId/quiz-attempts',
        async ({ headers, params, body }) => {
          const userId = resolveUserId(headers)
          return deps.submitQuiz.execute(
            userId,
            params.lessonId,
            params.blockId,
            body.answers,
            isPrivilegedActor(headers),
          )
        },
        { body: QuizAttemptBody, params: QuizAttemptParams },
      )
  )
}
