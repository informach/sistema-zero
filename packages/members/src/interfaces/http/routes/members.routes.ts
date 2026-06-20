import { Elysia } from 'elysia'
import type { BuyAvatarPartService } from '../../../application/avatar/buy-avatar-part.service'
import type { EquipAvatarService } from '../../../application/avatar/equip-avatar.service'
import type { GetAvatarService } from '../../../application/avatar/get-avatar.service'
import type { GetChildrenStatsService } from '../../../application/children-stats/get-children-stats.service'
import type { BuyStreakFreezeService } from '../../../application/gamification/buy-streak-freeze.service'
import type { ClaimMissionService } from '../../../application/gamification/claim-mission.service'
import type { GetGamificationService } from '../../../application/gamification/get-gamification.service'
import type { GetLeagueService } from '../../../application/gamification/get-league.service'
import type { GetMissionsService } from '../../../application/gamification/get-missions.service'
import type { SetVacationService } from '../../../application/gamification/set-vacation.service'
import type { GetAttachmentDownloadService } from '../../../application/get-attachment-download/get-attachment-download.service'
import type { GetCourseProgressService } from '../../../application/get-course-progress/get-course-progress.service'
import type { GetCourseRatingService } from '../../../application/get-course-rating/get-course-rating.service'
import type { GetEbookDownloadService } from '../../../application/get-ebook-download/get-ebook-download.service'
import type { GetLessonService } from '../../../application/get-lesson/get-lesson.service'
import type { GetMyCourseService } from '../../../application/get-my-course/get-my-course.service'
import type { GetShowcasePayloadService } from '../../../application/get-showcase-payload/get-showcase-payload.service'
import type { GetStudioCarryoverService } from '../../../application/get-studio-carryover/get-studio-carryover.service'
import type { ListCatalogService } from '../../../application/list-catalog/list-catalog.service'
import type { ListMyCoursesService } from '../../../application/list-my-courses/list-my-courses.service'
import type { MarkLessonCompleteService } from '../../../application/mark-lesson-complete/mark-lesson-complete.service'
import type { GetPublicProfileService } from '../../../application/profiles/get-public-profile.service'
import type { BuyRoomItemService } from '../../../application/room/buy-room-item.service'
import type { GetRoomService } from '../../../application/room/get-room.service'
import type { SaveRoomService } from '../../../application/room/save-room.service'
import type { SaveCourseRatingService } from '../../../application/save-course-rating/save-course-rating.service'
import type { SaveVideoPositionService } from '../../../application/save-video-position/save-video-position.service'
import type { SubmitQuizAttemptService } from '../../../application/submit-quiz-attempt/submit-quiz-attempt.service'
import type { SubmitStudioProjectService } from '../../../application/submit-studio-project/submit-studio-project.service'
import { AVATAR_STYLE } from '../../../domain/avatar/parts-catalog'
import { assertInternalCaller, isPrivilegedActor, resolveAccountId, resolveUserId } from '../auth'
import {
  AttachmentResolveParams,
  AudienceQuery,
  AvatarConfigBody,
  AvatarPartParams,
  ChildrenStatsQuery,
  CourseRatingBody,
  EbookResolveParams,
  GamificationQuery,
  LessonIdParams,
  MissionSlugParams,
  PublicProfileParams,
  parseProfileIds,
  QuizAttemptBody,
  QuizAttemptParams,
  RoomItemParams,
  RoomStateBody,
  ShowcasePayloadParams,
  SlugLessonParams,
  StudioCarryoverParams,
  StudioSubmissionBody,
  StudioSubmissionParams,
  VacationBody,
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
  getShowcasePayload: GetShowcasePayloadService
  getCourseRating: GetCourseRatingService
  saveCourseRating: SaveCourseRatingService
  getGamification: GetGamificationService
  getMissions: GetMissionsService
  claimMission: ClaimMissionService
  buyStreakFreeze: BuyStreakFreezeService
  setVacation: SetVacationService
  getLeague: GetLeagueService
  childrenStats: GetChildrenStatsService
  getAvatar: GetAvatarService
  buyAvatarPart: BuyAvatarPartService
  equipAvatar: EquipAvatarService
  getPublicProfile: GetPublicProfileService
  getRoom: GetRoomService
  saveRoom: SaveRoomService
  buyRoomItem: BuyRoomItemService
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
      // ── Missões (diárias/semanais) — recurso do PRÓPRIO perfil ──────────────
      .get(
        '/gamification/missions/me',
        async ({ headers, query }) =>
          deps.getMissions.execute(resolveUserId(headers), query.audience ?? 'kids'),
        { query: AudienceQuery },
      )
      // Resgata o prêmio (XP+moedas) de uma missão concluída (idempotente; 409 se não concluiu).
      .post(
        '/gamification/missions/:slug/claim',
        async ({ headers, params, query }) =>
          deps.claimMission.execute(resolveUserId(headers), query.audience ?? 'kids', params.slug),
        { params: MissionSlugParams, query: AudienceQuery },
      )
      // Compra 1 protetor de sequência com moedas (idempotente; 402 sem saldo; 409 no máximo).
      .post(
        '/gamification/streak-freeze/buy',
        async ({ headers, query }) =>
          deps.buyStreakFreeze.execute(resolveUserId(headers), query.audience ?? 'kids'),
        { query: AudienceQuery },
      )
      // Agenda/limpa as férias (pausa a sequência sem culpa). `from=to=null` limpa.
      .put(
        '/gamification/vacation',
        async ({ headers, body, query }) =>
          deps.setVacation.execute(
            resolveUserId(headers),
            resolveAccountId(headers),
            query.audience ?? 'kids',
            body.from,
            body.to,
          ),
        { body: VacationBody, query: AudienceQuery },
      )
      // Liga semanal: tier (resolvido lazy) + board da coorte por XP da semana.
      .get(
        '/gamification/league/me',
        async ({ headers, query }) =>
          deps.getLeague.execute(
            resolveUserId(headers),
            resolveAccountId(headers),
            query.audience ?? 'kids',
            isPrivilegedActor(headers),
          ),
        { query: AudienceQuery },
      )
      // ── Avatar (guarda-roupa por camadas) — recurso do PRÓPRIO perfil ───────
      // Estado: equipado + catálogo (owned/locked/price) + saldo Zappy (a lojinha).
      .get(
        '/avatar',
        async ({ headers, query }) => {
          const userId = resolveUserId(headers)
          return deps.getAvatar.execute(userId, query.audience ?? 'kids')
        },
        { query: AudienceQuery },
      )
      // Compra uma peça PAGA com moedas (idempotente; já possuída → no-op; sem saldo → 402).
      .post(
        '/avatar/parts/:partId/buy',
        async ({ headers, params, query }) => {
          const userId = resolveUserId(headers)
          return deps.buyAvatarPart.execute(userId, query.audience ?? 'kids', params.partId)
        },
        { params: AvatarPartParams, query: AudienceQuery },
      )
      // Salva a config equipada (ESTRITO: toda peça grátis OU possuída → senão 403/400).
      .put(
        '/avatar',
        async ({ headers, body, query }) => {
          const userId = resolveUserId(headers)
          const equipped = await deps.equipAvatar.execute(
            userId,
            resolveAccountId(headers),
            query.audience ?? 'kids',
            { style: body.style ?? AVATAR_STYLE, parts: body.parts },
          )
          return { equipped: equipped.parts, style: equipped.style }
        },
        { body: AvatarConfigBody, query: AudienceQuery },
      )
      // Perfil PÚBLICO de OUTRA criança (peer-viewable: qualquer aluno ativo lê). NÃO usa
      // CheckAccess — é recurso público da comunidade; o alvo é o `:profileId` (não o
      // viewer). Só dado de jogo (XP/ranking/conquistas-que-tem/avatar/quarto); o nome é
      // juntado pelo BFF (auth) e a flag dos pais gateia lá (404 se off).
      .get(
        '/profiles/:profileId/public',
        async ({ params, query }) =>
          deps.getPublicProfile.execute(params.profileId, query.audience ?? 'kids'),
        { params: PublicProfileParams, query: AudienceQuery },
      )
      // ── Quarto virtual (decore-do-seu-jeito) — recurso do PRÓPRIO perfil ────
      .get(
        '/room',
        async ({ headers, query }) =>
          deps.getRoom.execute(resolveUserId(headers), query.audience ?? 'kids'),
        { query: AudienceQuery },
      )
      // Salva o quarto montado (canonicalizado contra o inventário; só itens possuídos).
      .put(
        '/room',
        async ({ headers, body, query }) =>
          deps.saveRoom.execute(
            resolveUserId(headers),
            resolveAccountId(headers),
            query.audience ?? 'kids',
            {
              theme: body.theme,
              placedItems: body.placedItems,
              pet: body.pet,
            },
          ),
        { body: RoomStateBody, query: AudienceQuery },
      )
      // Compra um item/tema PAGO do quarto com moedas (idempotente; sem saldo → 402).
      .post(
        '/room/items/:itemId/buy',
        async ({ headers, params, query }) =>
          deps.buyRoomItem.execute(resolveUserId(headers), query.audience ?? 'kids', params.itemId),
        { params: RoomItemParams, query: AudienceQuery },
      )
      // Resumo de progresso dos FILHOS (área dos pais, kids). A conta vem do header
      // confiável `x-auth-user-id` (resolveUserId) — NÃO de query nem de resolveAccountId:
      // em sessão de PERFIL (criança) o userId é o perfil → não bate com nenhum
      // `account_id` → volta vazio (uma criança não enxerga os irmãos). O BFF chama isto
      // atrás do portão de senha; os `profileIds` vêm do auth e o members filtra por conta.
      .get(
        '/parents/children-stats',
        async ({ headers, query }) => {
          const accountId = resolveUserId(headers)
          return {
            children: await deps.childrenStats.execute(
              accountId,
              parseProfileIds(query.profileIds),
              {
                audience: query.audience ?? 'kids',
              },
            ),
          }
        },
        { query: ChildrenStatsQuery },
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
      // Payload AUTORITATIVO da vitrine (Mural): o BFF chama no clique "Publicar no
      // Mural" p/ montar o post (título/resumo do admin) sem confiar no cliente.
      // `{ eligible:false }` = bloco não é vitrine / desabilitado / aluno não enviou.
      .get(
        '/lessons/:lessonId/blocks/:blockId/showcase-payload',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.getShowcasePayload.execute(
            userId,
            params.lessonId,
            params.blockId,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          )
        },
        { params: ShowcasePayloadParams },
      )
  )
}
