import { Elysia } from 'elysia'
import type { PurgeUserDataService } from '../../../application/admin/purge-user-data/purge-user-data.service'
import type { GetAiUsageStatsService } from '../../../application/ai-usage/get-ai-usage-stats.service'
import type { GetCourseAnalyticsService } from '../../../application/analytics/get-course-analytics.service'
import type { ChallengeAdminService } from '../../../application/gamification/challenge-admin.service'
import type { GetGamificationService } from '../../../application/gamification/get-gamification.service'
import type { GetMemberActivityService } from '../../../application/get-member-activity/get-member-activity.service'
import type { GetMemberDetailService } from '../../../application/get-member-detail/get-member-detail.service'
import type {
  GrantManualCommand,
  GrantManualEntitlementService,
} from '../../../application/grant-manual-entitlement/grant-manual-entitlement.service'
import type { ListMemberCertificatesService } from '../../../application/list-member-certificates/list-member-certificates.service'
import type { ListMemberRatingsService } from '../../../application/list-member-ratings/list-member-ratings.service'
import type { ListMembersService } from '../../../application/list-members/list-members.service'
import type { ManageEntitlementService } from '../../../application/manage-entitlement/manage-entitlement.service'
import type { TeacherThreadsService } from '../../../application/teacher-threads/teacher-threads.service'
import type { RevokeCertificateService } from '../../../application/validate-certificate/validate-certificate.service'
import { InvalidEntitlementCommandError } from '../../../domain/entitlement/entitlement.errors'
import type { HubGateway } from '../../../domain/ports/hub-gateway.port'
import {
  assertInternalCaller,
  requireAdmin,
  resolveOptionalUserId,
  resolveStudentName,
  resolveUserId,
} from '../auth'
import {
  AdminActivityQuery,
  AdminGamificationQuery,
  AdminTeacherThreadByContextQuery,
  AdminTeacherThreadPostBody,
  AdminTeacherThreadsQuery,
  AiUsageStatsQuery,
  ChallengeMonthParams,
  ChallengeOverrideBody,
  ChallengeThemeBody,
  ChallengeThemePatchBody,
  CourseIdParams,
  GrantEntitlementBody,
  IdParams,
  ListMembersQuery,
  ManageEntitlementBody,
  MemberDetailQuery,
  parseProfileIds,
  TeacherThreadReplyBody,
  UserIdParams,
} from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface AdminRoutesDeps {
  requireAdminEnabled: boolean
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
  listMembers: ListMembersService
  getMemberDetail: GetMemberDetailService
  getMemberActivity: GetMemberActivityService
  listMemberCertificates: ListMemberCertificatesService
  listMemberRatings: ListMemberRatingsService
  getGamification: GetGamificationService
  analytics: GetCourseAnalyticsService
  /** Agregados de uso de IA (quota por conta) p/ o painel acompanhar o custo. */
  aiUsageStats: GetAiUsageStatsService
  grantManual: GrantManualEntitlementService
  manageEntitlement: ManageEntitlementService
  /** Canal de retorno professor↔aluno (caixa de entrada + responder). */
  teacherThreads: TeacherThreadsService
  /** Desafio do mês: tema por mês (override) + biblioteca de temas custom. */
  challengeAdmin: ChallengeAdminService
  revokeCertificate: RevokeCertificateService
  /** Purga TODOS os dados do aluno (exclusão de usuário pelo painel, superadmin-only no gateway). */
  purgeUserData: PurgeUserDataService
  /** Notifica o hub (comunidade) na concessão manual → invalida o cache de acesso na hora. */
  hub: HubGateway
}

/**
 * Rotas ADMIN da área de membros (gestão de acesso pelo painel). O RBAC real é do
 * gateway (JWT + role); aqui `requireAdmin` confere os headers `X-Auth-User-*`
 * (defesa em profundidade). Caminho `/members/admin/*` distinto da API do aluno
 * (`/members/courses…`) p/ gating inequívoco. Também exige o `x-internal-token`
 * (header-inject do gateway): os X-Auth-User-* só são confiáveis se a chamada
 * passou pelo gateway — sem o token, qualquer processo que alcance o members
 * direto na rede interna forjaria um admin. Checado no `onTransform` (antes da
 * validação → 401 antes de 422, espelhando o HMAC dos webhooks); o `requireAdmin`
 * por rota roda depois (precisa só dos headers de role, sempre presentes).
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  return (
    new Elysia({ prefix: '/members/admin' })
      .onTransform(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      .get(
        '/members',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.listMembers.execute({
            status: query.status,
            courseRef: query.courseRef,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListMembersQuery },
      )
      .get(
        '/members/:userId',
        async ({ params, query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          // `?profileIds=<csv>` → progresso POR PERFIL (estilo Netflix); ausente → só a conta.
          return deps.getMemberDetail.execute(params.userId, parseProfileIds(query.profileIds))
        },
        { params: UserIdParams, query: MemberDetailQuery },
      )
      // Gamificação do APRENDIZE (ficha admin): XP/nível/streak/badges/coins da vitrine
      // pedida. O `:userId` é o aprendiz (conta=adult / perfil=kids — o BFF passa a
      // audiência certa). Read-only: sem ranking (`accountId`=userId é irrelevante) nem
      // passe de equipe (o painel sempre vê o estado REAL do aluno).
      .get(
        '/members/:userId/gamification',
        async ({ params, query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.getGamification.execute(params.userId, params.userId, {
            audience: query.audience ?? 'adult',
            withRanking: false,
            privileged: false,
          })
        },
        { params: UserIdParams, query: AdminGamificationQuery },
      )
      // Linha do tempo de atividade do aprendiz (aulas/quizzes/entregas), paginada.
      .get(
        '/members/:userId/activity',
        async ({ params, query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.getMemberActivity.execute(params.userId, {
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { params: UserIdParams, query: AdminActivityQuery },
      )
      // Certificados emitidos para o aprendiz (inclui revogados).
      .get(
        '/members/:userId/certificates',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.listMemberCertificates.execute(params.userId)
        },
        { params: UserIdParams },
      )
      // Classificações que o aprendiz deu aos cursos.
      .get(
        '/members/:userId/ratings',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.listMemberRatings.execute(params.userId)
        },
        { params: UserIdParams },
      )
      // Analytics de aprendizado: overview por curso (conclusão) + funil por aula.
      // `/analytics/courses` (3 seg) e `/analytics/courses/:courseId` (4 seg) não
      // colidem com `/members/...` nem com `/courses/...` da autoria.
      .get('/analytics/courses', async ({ headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        return deps.analytics.overview()
      })
      .get(
        '/analytics/courses/:courseId',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.analytics.funnel(params.courseId)
        },
        { params: CourseIdParams },
      )
      // Uso de IA por conta (quota): agregados do mês p/ o painel acompanhar o
      // CUSTO (total/hoje/contas, breakdown por feature, série por dia, top contas
      // com a flag `privileged` p/ rotular a equipe). `?month=YYYY-MM` (ausente →
      // mês SP corrente). O painel hidrata os nomes das contas no auth.
      .get(
        '/ai-usage',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.aiUsageStats.execute(query.month)
        },
        { query: AiUsageStatsQuery },
      )
      // ── Conversas com o aluno (canal de retorno) ─────────────────────────────
      // Caixa de entrada do professor (todas as conversas, filtros) + abrir/responder
      // por id + ABRIR por contexto (Entrega/recado — o Mural entra por webhook) +
      // marcar lido. O nome de EXIBIÇÃO da mensagem é o do professor (header do gateway;
      // vazio → a UI kids mostra "Professor(a)"). O `authorId` = o staff que respondeu.
      .get(
        '/teacher-threads',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return {
            threads: await deps.teacherThreads.listForAdmin({
              audience: query.audience,
              contextType: query.context,
              courseId: query.courseId,
              unreadOnly: query.unread === 'true',
              limit: clampLimit(query.limit),
              offset: query.offset ?? 0,
            }),
          }
        },
        { query: AdminTeacherThreadsQuery },
      )
      .post(
        '/teacher-threads',
        async ({ body, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.teacherThreads.adminPostByContext({
            userId: body.userId,
            accountId: body.accountId ?? null,
            audience: body.audience,
            contextType: body.contextType,
            contextRef: body.contextType === 'studio_submission' ? (body.blockId ?? null) : null,
            courseId: body.courseId ?? null,
            lessonId: body.lessonId ?? null,
            title: body.title ?? null,
            authorId: resolveUserId(headers),
            authorName: resolveStudentName(headers) || null,
            body: body.body,
          })
        },
        { body: AdminTeacherThreadPostBody },
      )
      // Abrir a conversa da ENTREGA direto do viewer (por contexto) — ANTES de `:id`
      // (rota estática não pode cair no param). `{ thread: null }` = ainda não há conversa.
      .get(
        '/teacher-threads/by-context',
        async ({ query, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.teacherThreads.getForAdminByContext(
            query.userId,
            query.contextType,
            query.contextRef,
          )
        },
        { query: AdminTeacherThreadByContextQuery },
      )
      .get(
        '/teacher-threads/:id',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.teacherThreads.getForAdmin(params.id)
        },
        { params: IdParams },
      )
      .post(
        '/teacher-threads/:id/messages',
        async ({ params, body, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.teacherThreads.adminReplyToThread(
            params.id,
            resolveUserId(headers),
            resolveStudentName(headers) || null,
            body.body,
          )
        },
        { params: IdParams, body: TeacherThreadReplyBody },
      )
      .post(
        '/teacher-threads/:id/read',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.teacherThreads.markReadByTeacher(params.id)
        },
        { params: IdParams },
      )
      // ── Desafio do mês (Sala do Professor) ────────────────────────────────
      // Janela de meses com o tema RESOLVIDO (definido pelo professor ou
      // sorteado como fallback), override por mês e biblioteca de temas custom.
      .get('/challenge/months', async ({ headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        return deps.challengeAdmin.listMonths()
      })
      .put(
        '/challenge/months/:month',
        async ({ params, body, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.challengeAdmin.setMonth(params.month, body, resolveOptionalUserId(headers))
        },
        { params: ChallengeMonthParams, body: ChallengeOverrideBody },
      )
      .delete(
        '/challenge/months/:month',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.challengeAdmin.clearMonth(params.month)
        },
        { params: ChallengeMonthParams },
      )
      .get('/challenge/themes', async ({ headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        return deps.challengeAdmin.listThemes()
      })
      .post(
        '/challenge/themes',
        async ({ body, headers, set }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          set.status = 201
          return deps.challengeAdmin.createTheme(body)
        },
        { body: ChallengeThemeBody },
      )
      .patch(
        '/challenge/themes/:id',
        async ({ params, body, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.challengeAdmin.updateTheme(params.id, body)
        },
        { params: IdParams, body: ChallengeThemePatchBody },
      )
      .post(
        '/entitlements',
        async ({ body, headers, set }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          const expiresAt = parseDate(body.expiresAt)
          const cmd: GrantManualCommand =
            body.mode === 'offer'
              ? { mode: 'offer', userId: body.userId, offerRef: body.offerRef, expiresAt }
              : body.mode === 'course'
                ? { mode: 'course', userId: body.userId, courseRef: body.courseRef, expiresAt }
                : body.mode === 'all_kids_courses'
                  ? { mode: 'all_kids_courses', userId: body.userId, expiresAt }
                  : { mode: 'all_courses', userId: body.userId, expiresAt }
          const result = await deps.grantManual.execute(cmd)
          // Comunidade: avisa o hub p/ liberar espaços gated na hora (best-effort).
          await deps.hub.notifyAccessChanged(body.userId, 'grant')
          set.status = 201
          return result
        },
        { body: GrantEntitlementBody },
      )
      .patch(
        '/entitlements/:id',
        async ({ body, params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          const result = await deps.manageEntitlement.execute({
            id: params.id,
            action: body.action,
            expiresAt: parseDate(body.expiresAt) ?? undefined,
          })
          // Mudança manual de acesso também invalida o micro-cache do hub
          // (revogar/expirar corta acesso; estender/reativar libera).
          await deps.hub.notifyAccessChanged(result.userId, body.action)
          return result
        },
        { body: ManageEntitlementBody, params: IdParams },
      )
      // Purga TODOS os dados do aluno (exclusão de usuário pelo painel). DESTRUTIVA:
      // o gateway restringe a `superadmin`. `?profileIds=<csv>` cobre os perfis kids
      // (dados keyados no id do perfil + na conta). 5 segmentos — não colide com
      // `/members/admin/members/:userId`. Idempotente (DELETEs).
      .delete(
        '/users/:id/data',
        async ({ params, query, headers, set }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          await deps.purgeUserData.execute({
            userId: params.id,
            profileIds: parseProfileIds(query.profileIds),
          })
          set.status = 204
        },
        { params: IdParams, query: MemberDetailQuery },
      )
      // Revoga um certificado emitido (a validação pública passa a mostrar inválido).
      // `/members/admin/certificates/:id/revoke` (4 segmentos) não colide com as demais.
      .post(
        '/certificates/:id/revoke',
        async ({ params, headers }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          await deps.revokeCertificate.execute(params.id)
          return { revoked: true }
        },
        { params: IdParams },
      )
  )
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}

/** ISO-8601 → Date. `null`/ausente → `null`. Inválida → 400 (VALIDATION_ERROR). */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    throw new InvalidEntitlementCommandError('Data inválida (expiresAt)')
  return d
}
