import 'server-only'
import type {
  AdminEntitlementView,
  CourseTreeView,
  CourseView,
  LessonContentView,
  MemberSummaryView,
  Paginated,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

const enc = encodeURIComponent

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
  limit?: number
  offset?: number
}

export function listCourses(p: ListCoursesParams): Promise<GatewayResponse<Paginated<CourseView>>> {
  return gatewayFetch('/members/admin/courses', {
    query: { q: p.q, status: p.status, limit: p.limit, offset: p.offset },
  })
}
export function createCourse(body: unknown): Promise<GatewayResponse<CourseView>> {
  return gatewayFetch('/members/admin/courses', { method: 'POST', body })
}
export function getCourse(id: string): Promise<GatewayResponse<CourseTreeView>> {
  return gatewayFetch(`/members/admin/courses/${enc(id)}`)
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
/** Lista as entregas de um bloco de estúdio: `GET /members/admin/blocks/:id/studio-submissions`. */
export function listStudioSubmissions(blockId: string): Promise<
  GatewayResponse<{
    submissions: {
      userId: string
      submittedAt: string
      score: number | null
      checkedAt: string | null
      passed: boolean
    }[]
  }>
> {
  return gatewayFetch(`/members/admin/blocks/${enc(blockId)}/studio-submissions`)
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
  }>
> {
  return gatewayFetch(`/members/admin/blocks/${enc(blockId)}/studio-submissions/${enc(userId)}`)
}
