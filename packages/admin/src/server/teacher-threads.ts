import 'server-only'
import type { TeacherThreadSummaryView, TeacherThreadView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from '@/server/gateway'

const enc = encodeURIComponent

// Adapters da CAIXA DE ENTRADA do professor (página Recados). Os adapters da
// conversa POR CONTEXTO (viewer da Entrega) vivem em `server/members.ts`
// (`getTeacherThreadByContext`/`postTeacherThread`) — arquivo próprio aqui p/
// não misturar este lote com o WIP concorrente daquele arquivo.

export interface ListTeacherThreadsParams {
  audience?: string
  context?: string
  courseId?: string
  unread?: boolean
  /** Filtro por aluno (userId do perfil OU accountId do responsável — csv no members). */
  userIds?: string[]
  limit?: number
  offset?: number
}

/** Caixa de entrada do professor: `GET /members/admin/teacher-threads` (filtros). */
export function listTeacherThreads(
  p: ListTeacherThreadsParams,
): Promise<GatewayResponse<{ threads: TeacherThreadSummaryView[] }>> {
  return gatewayFetch('/members/admin/teacher-threads', {
    query: {
      audience: p.audience,
      context: p.context,
      courseId: p.courseId,
      unread: p.unread ? 'true' : undefined,
      userIds: p.userIds?.length ? p.userIds.join(',') : undefined,
      limit: p.limit,
      offset: p.offset,
    },
  })
}

/**
 * Badge da Sala do Professor: conversas com mensagem do aluno não lida POR ESTE
 * staff. `audience` opcional escopa à plataforma ativa (seletor global do painel).
 */
export function getTeacherThreadsUnreadCount(
  audience?: string,
): Promise<GatewayResponse<{ count: number }>> {
  return gatewayFetch('/members/admin/teacher-threads/unread-count', { query: { audience } })
}

/** "Marcar todas como lidas" (escopo opcional = filtros da caixa). */
export function markAllTeacherThreadsRead(body: {
  audience?: string
  context?: string
  courseId?: string
}): Promise<GatewayResponse<{ updated: number }>> {
  return gatewayFetch('/members/admin/teacher-threads/read-all', { method: 'POST', body })
}

/** Uma conversa (cabeçalho + turnos): `GET /members/admin/teacher-threads/:id`. */
export function getTeacherThread(
  id: string,
  before?: string,
): Promise<GatewayResponse<TeacherThreadView>> {
  return gatewayFetch(`/members/admin/teacher-threads/${enc(id)}`, { query: { before } })
}

/** Professor responde: `POST /members/admin/teacher-threads/:id/messages`. */
export function replyTeacherThread(
  id: string,
  body: unknown,
): Promise<GatewayResponse<TeacherThreadView>> {
  return gatewayFetch(`/members/admin/teacher-threads/${enc(id)}/messages`, {
    method: 'POST',
    body,
  })
}

/** Marca a conversa como lida pelo professor: `POST …/:id/read`. */
export function markTeacherThreadRead(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/admin/teacher-threads/${enc(id)}/read`, { method: 'POST' })
}
