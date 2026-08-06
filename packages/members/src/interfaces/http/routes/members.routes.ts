import { Elysia, t } from 'elysia'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import type { ConsumeAiUsageService } from '../../../application/ai-usage/consume-ai-usage.service'
import type { BuyAvatarPartService } from '../../../application/avatar/buy-avatar-part.service'
import type { EquipAvatarService } from '../../../application/avatar/equip-avatar.service'
import type { GetAvatarService } from '../../../application/avatar/get-avatar.service'
import type { GetAvatarsByProfilesService } from '../../../application/avatar/get-avatars-by-profiles.service'
import type { SetAvatarPhotoService } from '../../../application/avatar/set-avatar-photo.service'
import type { GetChildrenStatsService } from '../../../application/children-stats/get-children-stats.service'
import type { BuyStreakFreezeService } from '../../../application/gamification/buy-streak-freeze.service'
import type { ClaimMissionService } from '../../../application/gamification/claim-mission.service'
import type { GetChallengeService } from '../../../application/gamification/get-challenge.service'
import type { GetGamificationService } from '../../../application/gamification/get-gamification.service'
import type { GetLeagueService } from '../../../application/gamification/get-league.service'
import type { GetMissionsService } from '../../../application/gamification/get-missions.service'
import type { RecordStudioActivityDayService } from '../../../application/gamification/record-studio-activity-day.service'
import type { RecordStudioRemixService } from '../../../application/gamification/record-studio-remix.service'
import type { SetVacationService } from '../../../application/gamification/set-vacation.service'
import type { GetAttachmentDownloadService } from '../../../application/get-attachment-download/get-attachment-download.service'
import type { GetCertificateService } from '../../../application/get-certificate/get-certificate.service'
import type { GetCourseProgressService } from '../../../application/get-course-progress/get-course-progress.service'
import type { GetCourseRatingService } from '../../../application/get-course-rating/get-course-rating.service'
import type { GetEbookDownloadService } from '../../../application/get-ebook-download/get-ebook-download.service'
import type { GetLessonService } from '../../../application/get-lesson/get-lesson.service'
import type { GetMyCourseService } from '../../../application/get-my-course/get-my-course.service'
import type { GetOwnStudioSubmissionService } from '../../../application/get-own-studio-submission/get-own-studio-submission.service'
import type { GetShowcasePayloadService } from '../../../application/get-showcase-payload/get-showcase-payload.service'
import type { GetStudioCarryoverService } from '../../../application/get-studio-carryover/get-studio-carryover.service'
import type { IssueCertificateService } from '../../../application/issue-certificate/issue-certificate.service'
import type { ListCatalogService } from '../../../application/list-catalog/list-catalog.service'
import type { ListMyCoursesService } from '../../../application/list-my-courses/list-my-courses.service'
import type { MarkLessonCompleteService } from '../../../application/mark-lesson-complete/mark-lesson-complete.service'
import type { ParentReportPrefsService } from '../../../application/parent-report/report-prefs.service'
import type { GetProfileAllowanceService } from '../../../application/profile-allowance/get-profile-allowance.service'
import type { GetPublicProfileService } from '../../../application/profiles/get-public-profile.service'
import type { BuyRoomItemService } from '../../../application/room/buy-room-item.service'
import type { GetRoomService } from '../../../application/room/get-room.service'
import type { SaveRoomService } from '../../../application/room/save-room.service'
import type { SaveCourseRatingService } from '../../../application/save-course-rating/save-course-rating.service'
import type { SaveVideoPositionService } from '../../../application/save-video-position/save-video-position.service'
import type { SubmitQuizAttemptService } from '../../../application/submit-quiz-attempt/submit-quiz-attempt.service'
import type { SubmitStudioProjectService } from '../../../application/submit-studio-project/submit-studio-project.service'
import type { TeacherThreadsService } from '../../../application/teacher-threads/teacher-threads.service'
import type { ZappyHistoryService } from '../../../application/zappy/zappy-history.service'
import type { ZappyKnowledgeService } from '../../../application/zappy/zappy-knowledge.service'
import { AVATAR_CHAR_STYLE } from '../../../domain/avatar/avatar3d-catalog'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import type { RoomState } from '../../../domain/room/room-catalog'
import {
  assertInternalCaller,
  assertZappyBffConsumer,
  isPrivilegedActor,
  resolveAccountId,
  resolveStudentName,
  resolveUserId,
} from '../auth'
import {
  AccessQuery,
  AiUsageConsumeBody,
  AttachmentResolveParams,
  AudienceQuery,
  AvatarConfigBody,
  AvatarPartParams,
  AvatarPhotoBody,
  AvatarsBatchQuery,
  CertificateParams,
  ChildrenStatsQuery,
  CourseRatingBody,
  EbookResolveParams,
  GamificationQuery,
  IdParams,
  LessonIdParams,
  MissionSlugParams,
  ParentReportPrefsBody,
  PublicProfileParams,
  parseAccessRefs,
  parseProfileIds,
  QuizAttemptBody,
  QuizAttemptParams,
  RoomItemParams,
  RoomStateBody,
  ShowcasePayloadParams,
  SlugLessonParams,
  SlugParams,
  StudioCarryoverParams,
  StudioRemixBody,
  StudioSubmissionBody,
  StudioSubmissionParams,
  splitRequestedRefs,
  TeacherThreadPageQuery,
  TeacherThreadReplyBody,
  TeacherThreadsQuery,
  VacationBody,
  VideoPositionBody,
  ZappyFeedbackBody,
  ZappyHistoryQuery,
  ZappyInternalQuestionBody,
  ZappyInternalResponseBody,
  ZappyQuestionParams,
} from '../dtos'

function idempotencyKey(headers: Record<string, string | undefined>): string | undefined {
  return (headers['idempotency-key'] ?? headers['x-idempotency-key'])?.trim() || undefined
}

export interface MembersRoutesDeps {
  listMyCourses: ListMyCoursesService
  listCatalog: ListCatalogService
  accessCheck: AccessCheckService
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
  getOwnStudioSubmission: GetOwnStudioSubmissionService
  teacherThreads: TeacherThreadsService
  getShowcasePayload: GetShowcasePayloadService
  profileAllowance: GetProfileAllowanceService
  consumeAiUsage: ConsumeAiUsageService
  zappy?: ZappyHistoryService
  zappyKnowledge?: ZappyKnowledgeService
  getCertificate: GetCertificateService
  issueCertificate: IssueCertificateService
  getCourseRating: GetCourseRatingService
  saveCourseRating: SaveCourseRatingService
  getGamification: GetGamificationService
  getChallenge: GetChallengeService
  getMissions: GetMissionsService
  claimMission: ClaimMissionService
  recordRemix: RecordStudioRemixService
  recordStudioActivity: RecordStudioActivityDayService
  buyStreakFreeze: BuyStreakFreezeService
  setVacation: SetVacationService
  getLeague: GetLeagueService
  childrenStats: GetChildrenStatsService
  parentReportPrefs: ParentReportPrefsService
  getAvatar: GetAvatarService
  buyAvatarPart: BuyAvatarPartService
  equipAvatar: EquipAvatarService
  setAvatarPhoto: SetAvatarPhotoService
  getAvatarsByProfiles: GetAvatarsByProfilesService
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
  const zappyAccess = async (headers: Record<string, string | undefined>) => {
    if (isPrivilegedActor(headers)) return
    const access = await deps.accessCheck.execute(resolveAccountId(headers), ['estudio-completo'])
    if (
      !access.grants.includes('estudio-completo') &&
      !access.communities.includes('estudio-completo')
    ) {
      throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo')
    }
  }
  const zappy = () => {
    if (!deps.zappy) throw new Error('Zappy não configurado')
    return deps.zappy
  }
  const zappyKnowledge = () => {
    if (!deps.zappyKnowledge) throw new Error('Base de conhecimento do Zappy não configurada')
    return deps.zappyKnowledge
  }
  const zappyWriteAccess = async (headers: Record<string, string | undefined>) => {
    await zappyAccess(headers)
    if (headers['x-auth-impersonator-id']) {
      throw new AccessDeniedError('Impersonação não pode conversar com o Zappy')
    }
  }
  const zappyActorAccess = async (actor: { accountId: string; privileged: boolean }) => {
    if (actor.privileged) return
    const access = await deps.accessCheck.execute(actor.accountId, ['estudio-completo'])
    if (
      !access.grants.includes('estudio-completo') &&
      !access.communities.includes('estudio-completo')
    ) {
      throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo')
    }
  }
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
      // "Esta CONTA tem acesso a estes produtos?" — gate de produtos que NÃO são
      // curso de trilha (ex.: o Estúdio Completo como produto vendável). Resolve pela
      // CONTA (responsável compra; em sessão de perfil o acesso é da conta) e reporta
      // POR REF: matrícula específica (curso/comunidade) OU chave-mestra da vitrine.
      // Mesmo motor do `/internal/access-check` (que o hub usa S2S), mas fronteado por
      // JWT p/ o app do aluno consumir num Server Component.
      .get(
        '/access',
        async ({ headers, query }) => {
          // TODA ref pedida volta no mapa: as de formato inválido (que não vão à query)
          // recebem `false` EXPLÍCITO — em vez de sumir e o chamador não distinguir
          // "sem acesso" de "ref descartada".
          const requested = splitRequestedRefs(query.refs)
          // Passe livre da equipe (mesma régua dos cursos): superadmin/admin/staff acessam
          // TODO produto vendável (ex.: o Estúdio Completo) sem matrícula — testar/verificar
          // o Kids como um aluno comprador. O `x-auth-user-role` é confiável (gateway).
          if (isPrivilegedActor(headers)) {
            const access: Record<string, boolean> = {}
            for (const ref of requested) access[ref] = true
            return { access }
          }
          const valid = parseAccessRefs(query.refs)
          const result = await deps.accessCheck.execute(resolveAccountId(headers), valid)
          const validSet = new Set(valid)
          const access: Record<string, boolean> = {}
          // ⚠️ A chave-mestra (`all_courses`/`all_kids_courses`) é SÓ para CURSOS (decisão
          // do usuário). Esta rota gateia PRODUTOS NÃO-CURSO vendidos à parte (Estúdio,
          // e refs de comunidade), que exigem o PRÓPRIO acesso (`community`/matrícula
          // específica) — por isso NÃO aplicamos a chave-mestra aqui. (O acesso a curso
          // continua honrando a chave-mestra, mas pelo caminho do curso, não por esta rota.)
          for (const ref of requested) {
            access[ref] =
              validSet.has(ref) && (result.grants.includes(ref) || result.communities.includes(ref))
          }
          return { access }
        },
        { query: AccessQuery },
      )
      // Teto de PERFIS (kids) da CONTA — o app dos pais usa p/ travar o botão
      // "Adicionar" e mostrar "X de Y". Acesso pela CONTA (`resolveAccountId`); equipe
      // interna (privileged) → ilimitado (espelha o bypass do auth ao criar perfil).
      .get('/profile-allowance', async ({ headers }) => {
        if (isPrivilegedActor(headers)) return { maxProfiles: Number.MAX_SAFE_INTEGER }
        return deps.profileAllowance.execute(resolveAccountId(headers))
      })
      // Consome 1 crédito de IA da CONTA (quota diária + mensal — o BFF chama ANTES
      // de cada ida ao provedor de LLM). Keyado pela CONTA (`resolveAccountId`):
      // irmãos da mesma conta kids dividem o teto (o custo é por cliente, não por
      // perfil). Recusa é DOMÍNIO (200 + `allowed:false` + `scope`), não erro —
      // o BFF decide a UX (recado gentil do Zappy / fallback manual). Equipe
      // (`isPrivilegedActor`) nunca é recusada, mas o uso é gravado (custo visível).
      .post(
        '/ai-usage/consume',
        async ({ headers, body }) =>
          deps.consumeAiUsage.execute(
            resolveAccountId(headers),
            body.feature,
            isPrivilegedActor(headers),
          ),
        { body: AiUsageConsumeBody },
      )
      // Histórico do Zappy é isolado por perfil + projeto local. Snapshot/código
      // não atravessam estas rotas e nunca são persistidos no members.
      .get(
        '/zappy/history',
        async ({ headers, query }) => {
          await zappyAccess(headers)
          return zappy().history(resolveUserId(headers), query.projectId, query.before)
        },
        { query: ZappyHistoryQuery },
      )
      .delete(
        '/zappy/history',
        async ({ headers, query }) => {
          await zappyWriteAccess(headers)
          await zappy().delete(resolveUserId(headers), query.projectId)
          return { ok: true }
        },
        { query: ZappyHistoryQuery },
      )
      .post(
        '/internal/zappy/questions',
        async ({ headers, body }) => {
          assertZappyBffConsumer(headers['x-consumer-id'])
          await zappyActorAccess(body.actor)
          return zappy().reserve({
            userId: body.actor.userId,
            accountId: body.actor.accountId,
            projectId: body.projectId,
            clientMessageId: body.clientMessageId,
            question: body.question.trim(),
          })
        },
        { body: ZappyInternalQuestionBody },
      )
      .put(
        '/internal/zappy/questions/:id/response',
        async ({ headers, params, body }) => {
          assertZappyBffConsumer(headers['x-consumer-id'])
          await zappyActorAccess(body.actor)
          return zappy().complete({
            userId: body.actor.userId,
            projectId: body.projectId,
            questionId: params.id,
            response: body.response,
            latencyMs: body.latencyMs,
            outcome: body.outcome,
            rejection: body.rejection,
          })
        },
        { params: ZappyQuestionParams, body: ZappyInternalResponseBody },
      )
      .post(
        '/zappy/feedback',
        async ({ headers, body }) => {
          await zappyWriteAccess(headers)
          return {
            ok: await zappy().feedback(
              resolveUserId(headers),
              body.projectId,
              body.responseId,
              body.useful,
            ),
          }
        },
        { body: ZappyFeedbackBody },
      )
      .post(
        '/zappy/knowledge/search',
        async ({ headers, body }) => {
          await zappyWriteAccess(headers)
          return {
            hits: await zappyKnowledge().search({
              userId: resolveUserId(headers),
              accountId: resolveAccountId(headers),
              privileged: isPrivilegedActor(headers),
              query: body.query,
              limit: body.limit,
            }),
          }
        },
        {
          body: t.Object({
            query: t.String({ minLength: 1, maxLength: 1_000 }),
            limit: t.Optional(t.Integer({ minimum: 1, maximum: 10 })),
          }),
        },
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
            // Equipe não ranqueia (só cliente conta) — o service omite o ranking.
            privileged: isPrivilegedActor(headers),
          })
        },
        { query: GamificationQuery },
      )
      // Desafio do MÊS (game jam): tema determinístico global + `entered` do perfil.
      // A posse (Clube+Estúdio) gateia só a UI (via /members/access); o gate REAL do
      // publish com a tag é o do hub.
      .get(
        '/gamification/challenge',
        async ({ headers, query }) =>
          deps.getChallenge.execute(resolveUserId(headers), query.audience ?? 'kids'),
        { query: AudienceQuery },
      )
      // ── Missões (diárias/semanais/mensais) — recurso do PRÓPRIO perfil ──────
      // Progresso pelo PERFIL (userId); a posse que gateia missões (Clube) pela CONTA
      // (resolveAccountId); equipe (privileged) vê todas as missões gated.
      .get(
        '/gamification/missions/me',
        async ({ headers, query }) =>
          deps.getMissions.execute(
            resolveUserId(headers),
            resolveAccountId(headers),
            query.audience ?? 'kids',
            isPrivilegedActor(headers),
          ),
        { query: AudienceQuery },
      )
      // Resgata o prêmio (XP+moedas) de uma missão concluída (idempotente; 409 se não concluiu).
      .post(
        '/gamification/missions/:slug/claim',
        async ({ headers, params, query }) =>
          deps.claimMission.execute(
            resolveUserId(headers),
            resolveAccountId(headers),
            query.audience ?? 'kids',
            params.slug,
            isPrivilegedActor(headers),
          ),
        { params: MissionSlugParams, query: AudienceQuery },
      )
      // Registra o REMIX de um jogo do Mural ("Fazer a minha versão") — marco de missão
      // gated por estudio-completo. O service valida posse + playId no hub + não-self.
      // Best-effort do lado do cliente: SELF_REMIX é 200 inerte; hub fora → 503.
      .post(
        '/gamification/remix',
        async ({ headers, body, query, set }) => {
          const result = await deps.recordRemix.execute({
            userId: resolveUserId(headers),
            accountId: resolveAccountId(headers),
            audience: query.audience ?? 'kids',
            playId: body.playId,
            privileged: isPrivilegedActor(headers),
          })
          if (!result.recorded && result.reason === 'PLAY_NOT_FOUND') set.status = 404
          else if (
            !result.recorded &&
            (result.reason === 'HUB_UNAVAILABLE' || result.reason === 'AWARD_FAILED')
          ) {
            set.status = 503
          }
          return result
        },
        { body: StudioRemixBody, query: AudienceQuery },
      )
      // XP DIÁRIO de CRIAR no Estúdio (retenção pós-cursos): 1×/dia, MOVE o streak,
      // gated por posse do Estúdio (anti-farm). Sem corpo — é só "criou hoje". O
      // cliente dispara best-effort no autosave; AWARD_FAILED → 503 (ignorado lá).
      .post(
        '/gamification/activity',
        async ({ headers, query, set }) => {
          const result = await deps.recordStudioActivity.execute({
            userId: resolveUserId(headers),
            accountId: resolveAccountId(headers),
            audience: query.audience ?? 'kids',
            privileged: isPrivilegedActor(headers),
          })
          if (!result.recorded) set.status = 503
          return result
        },
        { query: AudienceQuery },
      )
      // Compra 1 protetor de sequência com moedas (idempotente; 402 sem saldo; 409 no máximo).
      .post(
        '/gamification/streak-freeze/buy',
        async ({ headers, query }) =>
          deps.buyStreakFreeze.execute(
            resolveUserId(headers),
            query.audience ?? 'kids',
            idempotencyKey(headers),
            isPrivilegedActor(headers),
          ),
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
          return deps.getAvatar.execute(
            userId,
            query.audience ?? 'kids',
            isPrivilegedActor(headers),
          )
        },
        { query: AudienceQuery },
      )
      // Compra uma peça PAGA com moedas (idempotente; já possuída → no-op; sem saldo → 402).
      .post(
        '/avatar/parts/:partId/buy',
        async ({ headers, params, query }) => {
          const userId = resolveUserId(headers)
          return deps.buyAvatarPart.execute(
            userId,
            query.audience ?? 'kids',
            params.partId,
            isPrivilegedActor(headers),
          )
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
            { version: 2, style: body.style ?? AVATAR_CHAR_STYLE, slots: body.slots },
          )
          return { equipped: equipped.slots, style: equipped.style }
        },
        { body: AvatarConfigBody, query: AudienceQuery },
      )
      // Salva a URL do snapshot (a "foto" do avatar) — o BFF sobe o PNG p/ o R2 e manda a URL.
      .put(
        '/avatar/photo',
        async ({ headers, body, query }) =>
          deps.setAvatarPhoto.execute(
            resolveUserId(headers),
            resolveAccountId(headers),
            query.audience ?? 'kids',
            body.photoUrl,
          ),
        { body: AvatarPhotoBody, query: AudienceQuery },
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
      // Avatar + NÍVEL em LOTE por profileId (peer-viewable, como o perfil público): o
      // BFF do Clube/Mural pinta rosto+aura de cada autor numa ida (sem N+1). Só dado
      // de jogo (foto do boneco 3D + slug do nível); nome/e-mail nunca passam por aqui.
      .get(
        '/avatars',
        async ({ query }) => ({
          avatars: await deps.getAvatarsByProfiles.execute(
            parseProfileIds(query.ids),
            query.audience ?? 'kids',
          ),
        }),
        { query: AvatarsBatchQuery },
      )
      // ── Quarto virtual (decore-do-seu-jeito) — recurso do PRÓPRIO perfil ────
      .get(
        '/room',
        async ({ headers, query }) =>
          deps.getRoom.execute(
            resolveUserId(headers),
            query.audience ?? 'kids',
            isPrivilegedActor(headers),
          ),
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
            // `rot`/cores/piso/luz chegam frouxos (number/string) — `canonicalizeRoomState`
            // é o portão (normaliza rot, valida a paleta e a posse). Repassa o corpo inteiro.
            body as RoomState,
          ),
        { body: RoomStateBody, query: AudienceQuery },
      )
      // Compra um item/tema PAGO do quarto com moedas (idempotente; sem saldo → 402).
      .post(
        '/room/items/:itemId/buy',
        async ({ headers, params, query }) =>
          deps.buyRoomItem.execute(
            resolveUserId(headers),
            query.audience ?? 'kids',
            params.itemId,
            isPrivilegedActor(headers),
          ),
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
      // Preferência do REPORT SEMANAL dos pais (opt-out). Keyada na CONTA — em
      // sessão de perfil o userId é o perfil e não acha pref nenhuma (a criança
      // não desliga o report dos pais); o BFF gateia atrás do portão de senha.
      .get('/parents/report-prefs', async ({ headers }) =>
        deps.parentReportPrefs.get(resolveUserId(headers)),
      )
      .put(
        '/parents/report-prefs',
        async ({ headers, body }) =>
          deps.parentReportPrefs.set(resolveUserId(headers), body.disabled),
        { body: ParentReportPrefsBody },
      )
      .get(
        '/courses/:slug',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.getMyCourse.execute(
            userId,
            params.slug,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          )
        },
        { params: SlugParams },
      )
      .get(
        '/courses/:slug/progress',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.getProgress.execute(
            userId,
            params.slug,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          )
        },
        { params: SlugParams },
      )
      // Classificação do curso (1 por aluno+curso; ver SaveCourseRatingService).
      .get(
        '/courses/:slug/rating',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return {
            rating: await deps.getCourseRating.execute(
              userId,
              params.slug,
              isPrivilegedActor(headers),
              resolveAccountId(headers),
            ),
          }
        },
        { params: SlugParams },
      )
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
        { body: CourseRatingBody, params: SlugParams },
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
            body.message ?? null,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
            resolveStudentName(headers) || null,
          )
        },
        { body: StudioSubmissionBody, params: StudioSubmissionParams },
      )
      // GET do MESMO bloco: o projeto que o aluno ENVIOU (save na nuvem). 2ª prioridade ao abrir
      // a aula (depois do rascunho local): num navegador novo, retoma o trabalho enviado. Lazy.
      .get(
        '/lessons/:lessonId/blocks/:blockId/studio-submission',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.getOwnStudioSubmission.execute(
            userId,
            params.lessonId,
            params.blockId,
            isPrivilegedActor(headers),
            resolveAccountId(headers),
          )
        },
        { params: StudioSubmissionParams },
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
      // ── Conversas com o professor (canal de retorno) ─────────────────────────
      // Caixa de entrada do aluno + responder + marcar lido + contador do sino. O
      // aluno só RESPONDE a conversas SUAS (posse checada → 404 sem vazar); INICIAR é
      // do professor (Entregas/recado) ou do sistema (Mural). Segregado por vitrine.
      // `unread-count` vem ANTES de `:id` (rota estática não pode cair no param).
      .get(
        '/teacher-threads',
        async ({ headers, query }) => {
          const userId = resolveUserId(headers)
          const limit = query.limit ?? 30
          const offset = query.offset ?? 0
          const page = await deps.teacherThreads.listForStudent(
            userId,
            query.audience ?? 'adult',
            limit + 1,
            offset,
          )
          return {
            threads: page.slice(0, limit),
            nextOffset: page.length > limit ? offset + limit : null,
          }
        },
        { query: TeacherThreadsQuery },
      )
      .get(
        '/teacher-threads/unread-count',
        async ({ headers, query }) => {
          const userId = resolveUserId(headers)
          return deps.teacherThreads.unreadCountForStudent(userId, query.audience ?? 'adult')
        },
        { query: AudienceQuery },
      )
      .get(
        '/teacher-threads/:id',
        async ({ headers, params, query }) => {
          const userId = resolveUserId(headers)
          return deps.teacherThreads.getForStudent(
            userId,
            query.audience ?? 'adult',
            params.id,
            query.before,
          )
        },
        { params: IdParams, query: TeacherThreadPageQuery },
      )
      .post(
        '/teacher-threads/:id/messages',
        async ({ headers, params, query, body }) => {
          const userId = resolveUserId(headers)
          return deps.teacherThreads.studentReply(
            userId,
            query.audience ?? 'adult',
            params.id,
            body.body,
          )
        },
        { params: IdParams, query: AudienceQuery, body: TeacherThreadReplyBody },
      )
      .post(
        '/teacher-threads/:id/read',
        async ({ headers, params, query }) => {
          const userId = resolveUserId(headers)
          return deps.teacherThreads.markReadByStudent(userId, query.audience ?? 'adult', params.id)
        },
        { params: IdParams, query: AudienceQuery },
      )
      // Estado do bloco certificado p/ a UI (emitir vs baixar): `eligible` (aulas
      // anteriores concluídas) + `issued`/serial/data se já emitido.
      .get(
        '/lessons/:lessonId/blocks/:blockId/certificate',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.getCertificate.execute({
            userId,
            accountId: resolveAccountId(headers),
            lessonId: params.lessonId,
            blockId: params.blockId,
            privileged: isPrivilegedActor(headers),
          })
        },
        { params: CertificateParams },
      )
      // Emite o certificado (idempotente por aluno+curso). O nome do aluno vem dos
      // headers CONFIÁVEIS do gateway (perfil kids / conta), NÃO do corpo. Devolve o
      // registro + a config do bloco (o BFF monta o PDF). 409 se não elegível.
      .post(
        '/lessons/:lessonId/blocks/:blockId/certificate',
        async ({ headers, params }) => {
          const userId = resolveUserId(headers)
          return deps.issueCertificate.execute({
            userId,
            accountId: resolveAccountId(headers),
            lessonId: params.lessonId,
            blockId: params.blockId,
            studentName: resolveStudentName(headers),
            privileged: isPrivilegedActor(headers),
          })
        },
        { params: CertificateParams },
      )
  )
}
