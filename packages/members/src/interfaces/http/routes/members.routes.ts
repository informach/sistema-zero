import { Elysia } from 'elysia'
import type { GetGamificationService } from '../../../application/gamification/get-gamification.service'
import type { GetAttachmentDownloadService } from '../../../application/get-attachment-download/get-attachment-download.service'
import type { GetCourseProgressService } from '../../../application/get-course-progress/get-course-progress.service'
import type { GetCourseRatingService } from '../../../application/get-course-rating/get-course-rating.service'
import type { GetEbookDownloadService } from '../../../application/get-ebook-download/get-ebook-download.service'
import type { GetLessonService } from '../../../application/get-lesson/get-lesson.service'
import type { GetMyCourseService } from '../../../application/get-my-course/get-my-course.service'
import type { GetStudioCarryoverService } from '../../../application/get-studio-carryover/get-studio-carryover.service'
import type { ListCatalogService } from '../../../application/list-catalog/list-catalog.service'
import type { ListMyCoursesService } from '../../../application/list-my-courses/list-my-courses.service'
import type { MarkLessonCompleteService } from '../../../application/mark-lesson-complete/mark-lesson-complete.service'
import type { SaveCourseRatingService } from '../../../application/save-course-rating/save-course-rating.service'
import type { SaveVideoPositionService } from '../../../application/save-video-position/save-video-position.service'
import type { SubmitQuizAttemptService } from '../../../application/submit-quiz-attempt/submit-quiz-attempt.service'
import type { SubmitStudioProjectService } from '../../../application/submit-studio-project/submit-studio-project.service'
import { assertInternalCaller, isPrivilegedActor, resolveAccountId, resolveUserId } from '../auth'
import {
  AttachmentResolveParams,
  AudienceQuery,
  CourseRatingBody,
  EbookResolveParams,
  GamificationQuery,
  LessonIdParams,
  QuizAttemptBody,
  QuizAttemptParams,
  SlugLessonParams,
  StudioCarryoverParams,
  StudioSubmissionBody,
  StudioSubmissionParams,
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
  submitStudio: SubmitStudioProjectService
  getStudioCarryover: GetStudioCarryoverService
  getCourseRating: GetCourseRatingService
  saveCourseRating: SaveCourseRatingService
  getGamification: GetGamificationService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
}

/**
 * API de consumo do aluno. O `userId` vem do header `x-auth-user-id` (injetado
 * pelo gateway após verificar o JWT) e identifica os DADOS (progresso/XP/comunidade).
 * Em sessão de PERFIL (estilo Netflix) o `x-auth-user-id` é o PERFIL de criança e o
 * gateway injeta também `x-auth-account-id` (a CONTA do responsável) — usado só para
 * resolver o ACESSO/matrícula (`resolveAccountId`; ausente → cai no userId, compat).
 * Todo endpoint de conteúdo exige matrícula ativa (403 sem vazar conteúdo) via
 * `CheckAccessService` dentro dos casos de uso — EXCETO equipe interna
 * (`isPrivilegedActor`): superadmin/admin/staff navegam tudo com chave-mestra virtual.
 * O `onTransform` confirma (em prod) que a chamada veio do gateway (token interno)
 * ANTES da validação do corpo/params — 401 antes de 422, espelhando o HMAC dos webhooks.
 */
export function membersRoutes(deps: MembersRoutesDeps) {
  return (
    new Elysia({ prefix: '/members' })
      .onTransform(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      // Listagens por VITRINE: `?audience=adult|kids` (ausente → adult; inválido → 400).
      .get(
        '/courses',
        async ({ headers, query }) => {
          const userId = resolveUserId(headers)
          return {
            courses: await deps.listMyCourses.execute(
              userId,
              isPrivilegedActor(headers),
              query.audience ?? 'adult',
              resolveAccountId(headers),
            ),
          }
        },
        { query: AudienceQuery },
      )
      // Catálogo "Todos os cursos" (published da audiência + flag hasAccess do aluno).
      .get(
        '/catalog',
        async ({ headers, query }) => {
          const userId = resolveUserId(headers)
          return {
            courses: await deps.listCatalog.execute(
              userId,
              isPrivilegedActor(headers),
              query.audience ?? 'adult',
              resolveAccountId(headers),
            ),
          }
        },
        { query: AudienceQuery },
      )
      // Perfil de gamificação do aluno NA VITRINE (`?audience=`, default adult —
      // XP/streak/badges são segregados por audiência) — recurso do PRÓPRIO
      // usuário (sem CheckAccess: qualquer conta ativa; sem perfil → zeros).
      // É do PERFIL (userId) — não usa accountId; o XP é da criança, não da conta.
      // `?ranking=true` inclui a colocação no ranking de XP da mesma vitrine.
      .get(
        '/gamification/me',
        async ({ headers, query }) => {
          const userId = resolveUserId(headers)
          // XP/streak/badges pelo PERFIL (userId); a coorte do ranking pela CONTA.
          return deps.getGamification.execute(userId, resolveAccountId(headers), {
            audience: query.audience ?? 'adult',
            withRanking: query.ranking === 'true',
          })
        },
        { query: GamificationQuery },
      )
      .get('/courses/:slug', async ({ headers, params }) => {
        const userId = resolveUserId(headers)
        return deps.getMyCourse.execute(
          userId,
          params.slug,
          isPrivilegedActor(headers),
          resolveAccountId(headers),
        )
      })
      .get('/courses/:slug/progress', async ({ headers, params }) => {
        const userId = resolveUserId(headers)
        return deps.getProgress.execute(
          userId,
          params.slug,
          isPrivilegedActor(headers),
          resolveAccountId(headers),
        )
      })
      // Classificação do curso (1 por aluno+curso; ver SaveCourseRatingService).
      .get('/courses/:slug/rating', async ({ headers, params }) => {
        const userId = resolveUserId(headers)
        return {
          rating: await deps.getCourseRating.execute(
            userId,
            params.slug,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
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
            resolveAccountId(headers),
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
            resolveAccountId(headers),
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
            resolveAccountId(headers),
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
            resolveAccountId(headers),
          )
        },
        { params: EbookResolveParams },
      )
      .post(
        '/lessons/:lessonId/complete',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.markComplete.execute(
            userId,
            params.lessonId,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          )
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
            resolveAccountId(headers),
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
            resolveAccountId(headers),
          )
        },
        { body: QuizAttemptBody, params: QuizAttemptParams },
      )
      // Entrega do projeto do Estúdio (mesmo JSON do "Exportar projeto"). Upsert por
      // aluno+bloco; destrava a conclusão da aula (gate em mark-lesson-complete).
      .post(
        '/lessons/:lessonId/blocks/:blockId/studio-submission',
        async ({ headers, params, body }) => {
          const userId = resolveUserId(headers)
          return deps.submitStudio.execute(
            userId,
            params.lessonId,
            params.blockId,
            body.project,
            body.results ?? [],
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          )
        },
        { body: StudioSubmissionBody, params: StudioSubmissionParams },
      )
      // Carrega o projeto da aula contínua anterior (mesma cadeia) p/ semear o editor
      // na 1ª abertura. Lazy: o front só chama quando o bloco tem `chain` e não há
      // rascunho local. `{ project: null }` = 1ª da cadeia / não enviou / independente.
      .get(
        '/lessons/:lessonId/blocks/:blockId/studio-carryover',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.getStudioCarryover.execute(
            userId,
            params.lessonId,
            params.blockId,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          )
        },
        { params: StudioCarryoverParams },
      )
  )
}
