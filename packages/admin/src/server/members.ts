import 'server-only'
import type { MemberToolUsageView } from '@/lib/tool-usage'
import type {
  AdminEntitlementView,
  AiUsageStatsView,
  CourseAnalyticsView,
  CourseFunnelView,
  CourseTreeView,
  CourseView,
  LessonContentView,
  MemberActivityPage,
  MemberCertificateView,
  MemberGamificationView,
  MemberRatingView,
  MemberSummaryView,
  Paginated,
  TeacherThreadView,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

const enc = encodeURIComponent

/**
 * Agregados de uso de IA por conta (quota 50/dia + 500/mês): totais do mês,
 * breakdown por recurso e top contas (o handler hidrata a identidade no auth).
 * `month` = `YYYY-MM` (ausente → mês corrente em SP).
 */
export function getAiUsageStats(
  month?: string,
): Promise<GatewayResponse<Omit<AiUsageStatsView, 'topAccounts'> & AiUsageStatsRaw>> {
  return gatewayFetch('/members/admin/ai-usage', { query: { month } })
}

interface AiUsageStatsRaw {
  topAccounts: { accountId: string; used: number; privileged: boolean }[]
}

export interface ListMembersParams {
  status?: string
  courseRef?: string
  limit?: number
  offset?: number
}

/** Lista membros (admin) via gateway: `GET /members/admin/members` (JWT + RBAC). */
export function listMembers(
  p: ListMembersParams,
): Promise<GatewayResponse<Paginated<MemberSummaryView>>> {
  return gatewayFetch('/members/admin/members', {
    query: { status: p.status, courseRef: p.courseRef, limit: p.limit, offset: p.offset },
  })
}

interface CourseProgress {
  courseRef: string
  title: string | null
  status: string | null
  completedLessons: number
  totalLessons: number
  percent: number
}

export interface MemberDetailResponse {
  userId: string
  entitlements: AdminEntitlementView[]
  progress: CourseProgress[]
  /** Progresso POR PERFIL (estilo Netflix) — presente quando o painel passa `profileIds`. */
  profilesProgress?: { userId: string; progress: CourseProgress[] }[]
}

/**
 * Detalhe de um membro: `GET /members/admin/members/:userId`. Com `profileIds` (os
 * perfis da conta, do auth), o members devolve TAMBÉM o progresso de cada perfil.
 */
export function getMember(
  userId: string,
  profileIds: string[] = [],
): Promise<GatewayResponse<MemberDetailResponse>> {
  return gatewayFetch(`/members/admin/members/${encodeURIComponent(userId)}`, {
    query: { profileIds: profileIds.length > 0 ? profileIds.join(',') : undefined },
  })
}

/** Uma linha do enriquecimento da listagem de crianças (espelha o members). */
export interface ProfileOverviewView {
  profileId: string
  xp: number
  levelSlug: string
  streakCurrent: number
  lastActivityDate: string | null
  pendingSubmissions: number
}

/**
 * Enriquecimento em LOTE da listagem de CRIANÇAS: `GET /members/admin/profiles-overview`.
 * Os profileIds vêm da página de busca do auth (≤50 — o teto da página).
 */
export function getProfilesOverview(
  profileIds: string[],
  audience: 'adult' | 'kids' = 'kids',
): Promise<GatewayResponse<{ profiles: ProfileOverviewView[] }>> {
  return gatewayFetch('/members/admin/profiles-overview', {
    query: { profileIds: profileIds.join(','), audience },
  })
}

/**
 * USO das ferramentas (Pensa/Pinta/Estúdio/Clube/Mural) por aprendiz da família:
 * `GET /members/admin/members/:userId/tool-usage`. Clube/Mural são best-effort no
 * members (hub fora → campos `null`) — a chamada nunca vira 500 por causa do hub.
 */
export function getMemberToolUsage(
  userId: string,
  profileIds: string[] = [],
): Promise<GatewayResponse<MemberToolUsageView>> {
  return gatewayFetch(`/members/admin/members/${encodeURIComponent(userId)}/tool-usage`, {
    query: { profileIds: profileIds.length > 0 ? profileIds.join(',') : undefined },
  })
}

/**
 * Gamificação do aprendiz (ficha 360): `GET /members/admin/members/:userId/gamification`.
 * `audience` = `adult` para a conta, `kids` para um perfil (o BFF chama por aprendiz).
 */
export function getMemberGamification(
  userId: string,
  audience: 'adult' | 'kids',
): Promise<GatewayResponse<MemberGamificationView>> {
  return gatewayFetch(`/members/admin/members/${enc(userId)}/gamification`, {
    query: { audience },
  })
}

/** Linha do tempo de atividade do aprendiz: `GET /members/admin/members/:userId/activity`. */
export function getMemberActivity(
  userId: string,
  p: { limit?: number; offset?: number } = {},
): Promise<GatewayResponse<MemberActivityPage>> {
  return gatewayFetch(`/members/admin/members/${enc(userId)}/activity`, {
    query: { limit: p.limit, offset: p.offset },
  })
}

/** Certificados emitidos para o aprendiz: `GET /members/admin/members/:userId/certificates`. */
export function getMemberCertificates(
  userId: string,
): Promise<GatewayResponse<{ certificates: MemberCertificateView[] }>> {
  return gatewayFetch(`/members/admin/members/${enc(userId)}/certificates`)
}

/** Classificações dadas pelo aprendiz: `GET /members/admin/members/:userId/ratings`. */
export function getMemberRatings(
  userId: string,
): Promise<GatewayResponse<{ ratings: MemberRatingView[] }>> {
  return gatewayFetch(`/members/admin/members/${enc(userId)}/ratings`)
}

/** Revoga um certificado emitido: `POST /members/admin/certificates/:id/revoke`. */
export function revokeCertificate(id: string): Promise<GatewayResponse<{ revoked: boolean }>> {
  return gatewayFetch(`/members/admin/certificates/${enc(id)}/revoke`, { method: 'POST' })
}

/** Analytics de aprendizado — overview por curso: `GET /members/admin/analytics/courses`. */
export function getCourseAnalytics(): Promise<GatewayResponse<{ courses: CourseAnalyticsView[] }>> {
  return gatewayFetch('/members/admin/analytics/courses')
}

/** Funil por aula de um curso: `GET /members/admin/analytics/courses/:courseId`. */
export function getCourseFunnel(courseId: string): Promise<GatewayResponse<CourseFunnelView>> {
  return gatewayFetch(`/members/admin/analytics/courses/${enc(courseId)}`)
}

/** Concessão manual de acesso: `POST /members/admin/entitlements` (oferta ou curso). */
export function grantEntitlement(
  body: unknown,
): Promise<GatewayResponse<{ granted: AdminEntitlementView[] }>> {
  return gatewayFetch('/members/admin/entitlements', { method: 'POST', body })
}

/** Revogar/expirar/estender uma matrícula: `PATCH /members/admin/entitlements/:id`. */
export function manageEntitlement(
  id: string,
  body: unknown,
): Promise<GatewayResponse<AdminEntitlementView>> {
  return gatewayFetch(`/members/admin/entitlements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  })
}

// ── Autoria de conteúdo (cursos → módulos → aulas → blocos/anexos) ──────────

export interface ListCoursesParams {
  q?: string
  status?: string
  /** Plataforma (seletor global do painel) — o members filtra a listagem. */
  audience?: 'adult' | 'kids'
  limit?: number
  offset?: number
}

export function listCourses(p: ListCoursesParams): Promise<GatewayResponse<Paginated<CourseView>>> {
  return gatewayFetch('/members/admin/courses', {
    query: { q: p.q, status: p.status, audience: p.audience, limit: p.limit, offset: p.offset },
  })
}
export function createCourse(body: unknown): Promise<GatewayResponse<CourseView>> {
  return gatewayFetch('/members/admin/courses', { method: 'POST', body })
}
export function getCourse(id: string): Promise<GatewayResponse<CourseTreeView>> {
  return gatewayFetch(`/members/admin/courses/${enc(id)}`)
}
/** CLONA o curso p/ a outra plataforma (fork — edições não sincronizam). */
export function cloneCourse(id: string, body: unknown): Promise<GatewayResponse<CourseView>> {
  return gatewayFetch(`/members/admin/courses/${enc(id)}/clone`, { method: 'POST', body })
}
export function updateCourse(id: string, body: unknown): Promise<GatewayResponse<CourseView>> {
  return gatewayFetch(`/members/admin/courses/${enc(id)}`, { method: 'PATCH', body })
}
export function deleteCourse(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/courses/${enc(id)}`, { method: 'DELETE' })
}

export function createModule(courseId: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/courses/${enc(courseId)}/modules`, { method: 'POST', body })
}
export function reorderModules(
  courseId: string,
  orderedIds: string[],
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/courses/${enc(courseId)}/modules/reorder`, {
    method: 'POST',
    body: { orderedIds },
  })
}
export function updateModule(id: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/modules/${enc(id)}`, { method: 'PATCH', body })
}
export function deleteModule(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/modules/${enc(id)}`, { method: 'DELETE' })
}

export function createLesson(moduleId: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/modules/${enc(moduleId)}/lessons`, { method: 'POST', body })
}
export function reorderLessons(
  moduleId: string,
  orderedIds: string[],
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/modules/${enc(moduleId)}/lessons/reorder`, {
    method: 'POST',
    body: { orderedIds },
  })
}
export function updateLesson(id: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/lessons/${enc(id)}`, { method: 'PATCH', body })
}
export function deleteLesson(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/lessons/${enc(id)}`, { method: 'DELETE' })
}
export function getLessonContent(id: string): Promise<GatewayResponse<LessonContentView>> {
  return gatewayFetch(`/members/admin/lessons/${enc(id)}/content`)
}

export function createBlock(lessonId: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/lessons/${enc(lessonId)}/blocks`, { method: 'POST', body })
}
export function reorderBlocks(
  lessonId: string,
  orderedIds: string[],
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/lessons/${enc(lessonId)}/blocks/reorder`, {
    method: 'POST',
    body: { orderedIds },
  })
}
export function updateBlock(id: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/blocks/${enc(id)}`, { method: 'PATCH', body })
}
export function deleteBlock(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/blocks/${enc(id)}`, { method: 'DELETE' })
}

export function createAttachment(
  lessonId: string,
  body: unknown,
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/lessons/${enc(lessonId)}/attachments`, {
    method: 'POST',
    body,
  })
}
export function reorderAttachments(
  lessonId: string,
  orderedIds: string[],
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/lessons/${enc(lessonId)}/attachments/reorder`, {
    method: 'POST',
    body: { orderedIds },
  })
}
export function updateAttachment(id: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/attachments/${enc(id)}`, { method: 'PATCH', body })
}
export function deleteAttachment(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/attachments/${enc(id)}`, { method: 'DELETE' })
}

// ── Entregas do Estúdio (acompanhamento do professor) ──
/**
 * Entregas de TODAS as aulas de um curso (aba "Entregas" por curso):
 * `GET /members/admin/courses/:id/studio-submissions`. Cada linha traz a aula/módulo
 * e o `blockId` — o detalhe reusa a rota por-bloco (`getStudioSubmission`).
 */
export function listCourseStudioSubmissions(courseId: string): Promise<
  GatewayResponse<{
    submissions: {
      userId: string
      accountId: string | null
      blockId: string
      lessonId: string
      lessonTitle: string
      moduleTitle: string
      submittedAt: string
      score: number | null
      checkedAt: string | null
      passed: boolean
      /** Recado opcional do aluno ao professor. `null` = sem recado. */
      message: string | null
    }[]
  }>
> {
  return gatewayFetch(`/members/admin/courses/${enc(courseId)}/studio-submissions`)
}
/** Projeto + correção de UMA entrega: `GET /members/admin/blocks/:id/studio-submissions/:userId`. */
export function getStudioSubmission(
  blockId: string,
  userId: string,
): Promise<
  GatewayResponse<{
    project: unknown
    submittedAt: string
    score: number | null
    results: unknown
    checkedAt: string | null
    passed: boolean
    /** Recado opcional do aluno ao professor. `null` = sem recado. */
    message: string | null
    /** ISO do carimbo "já conferi"; `null` = nunca conferida. */
    reviewedAt: string | null
    /** O carimbo vale para a entrega ATUAL (um reenvio depois dele o invalida). */
    reviewed: boolean
    /** ISO da versão ANTERIOR (backup do reenvio); `null`/ausente = sem reenvio. */
    previousSubmittedAt?: string | null
  }>
> {
  return gatewayFetch(`/members/admin/blocks/${enc(blockId)}/studio-submissions/${enc(userId)}`)
}

/**
 * A versão ANTERIOR da entrega (backup do último reenvio):
 * `GET /members/admin/blocks/:id/studio-submissions/:userId/previous`. 404 quando
 * nunca houve reenvio — o viewer só chama quando o detalhe traz o timestamp.
 */
export function getStudioSubmissionPrevious(
  blockId: string,
  userId: string,
): Promise<GatewayResponse<{ project: unknown; submittedAt: string }>> {
  return gatewayFetch(
    `/members/admin/blocks/${enc(blockId)}/studio-submissions/${enc(userId)}/previous`,
  )
}

/**
 * Restaura a versão anterior (TROCA atual↔anterior; reversível — 2× volta):
 * `POST /members/admin/studio-submissions/:blockId/:userId/restore-previous`.
 * Zera a correção; preserva o "aprovado" sticky, o carimbo e o recado.
 */
export function restoreStudioSubmissionPrevious(
  blockId: string,
  userId: string,
): Promise<GatewayResponse<{ restored: true }>> {
  return gatewayFetch(
    `/members/admin/studio-submissions/${enc(blockId)}/${enc(userId)}/restore-previous`,
    { method: 'POST' },
  )
}

/**
 * Contagem de entregas do curso, agregada por bloco e por aula:
 * `GET /members/admin/courses/:id/submission-counts`. Alimenta o aviso "N
 * entregas serão apagadas junto" dos confirms de exclusão (as FKs em cascata
 * apagam `studio_submissions` em silêncio). Módulo = soma das aulas no cliente.
 */
export function getCourseSubmissionCounts(courseId: string): Promise<
  GatewayResponse<{
    total: number
    byLesson: Record<string, number>
    byBlock: Record<string, number>
  }>
> {
  return gatewayFetch(`/members/admin/courses/${enc(courseId)}/submission-counts`)
}

/**
 * "Já conferi esta entrega": `POST /members/admin/studio-submissions/:blockId/:userId/review`.
 * É o que fecha a entrega SEM recado (não há conversa para responder). `reviewed:
 * false` desfaz. Não manda recado nenhum ao aluno — só acende o selo dele.
 */
export function reviewStudioSubmission(
  blockId: string,
  userId: string,
  reviewed: boolean,
): Promise<GatewayResponse<{ reviewed: boolean; reviewedAt: string | null }>> {
  return gatewayFetch(`/members/admin/studio-submissions/${enc(blockId)}/${enc(userId)}/review`, {
    method: 'POST',
    body: { reviewed },
  })
}

// ── Conversas com o aluno (canal de retorno) ────────────────────────────────
/** Conversa da Entrega/Mural por CONTEXTO: `GET /members/admin/teacher-threads/by-context`. */
export function getTeacherThreadByContext(q: {
  userId: string
  contextType: string
  contextRef: string
  before?: string
}): Promise<GatewayResponse<{ thread: TeacherThreadView | null }>> {
  const qs = new URLSearchParams({
    userId: q.userId,
    contextType: q.contextType,
    contextRef: q.contextRef,
    ...(q.before ? { before: q.before } : {}),
  })
  return gatewayFetch(`/members/admin/teacher-threads/by-context?${qs.toString()}`)
}
/** Professor abre/continua uma conversa por CONTEXTO: `POST /members/admin/teacher-threads`. */
export function postTeacherThread(body: unknown): Promise<GatewayResponse<TeacherThreadView>> {
  return gatewayFetch('/members/admin/teacher-threads', { method: 'POST', body })
}
