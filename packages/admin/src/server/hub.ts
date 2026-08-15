import 'server-only'
import type {
  HubMuteBanView,
  HubPendingItemView,
  HubReportView,
  HubResolvedAttachment,
  HubSpaceTreeView,
  HubSpaceView,
} from '@/lib/hub-types'
import type { Paginated } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

const enc = encodeURIComponent

export interface HubListParams {
  q?: string
  audience?: string
  status?: string
  limit?: number
  offset?: number
}

// ── Servidores ──
export function listSpaces(p: HubListParams): Promise<GatewayResponse<Paginated<HubSpaceView>>> {
  return gatewayFetch('/hub/admin/spaces', {
    query: { q: p.q, audience: p.audience, status: p.status, limit: p.limit, offset: p.offset },
  })
}
export function getSpace(id: string): Promise<GatewayResponse<HubSpaceTreeView>> {
  return gatewayFetch(`/hub/admin/spaces/${enc(id)}`)
}
export function createSpace(body: unknown): Promise<GatewayResponse<HubSpaceView>> {
  return gatewayFetch('/hub/admin/spaces', { method: 'POST', body })
}
export function updateSpace(id: string, body: unknown): Promise<GatewayResponse<HubSpaceView>> {
  return gatewayFetch(`/hub/admin/spaces/${enc(id)}`, { method: 'PATCH', body })
}
export function deleteSpace(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/spaces/${enc(id)}`, { method: 'DELETE' })
}
export function reorderSpaces(body: {
  audience: string
  orderedIds: string[]
}): Promise<GatewayResponse<unknown>> {
  return gatewayFetch('/hub/admin/spaces/reorder', { method: 'POST', body })
}

// ── Canais ──
export function createChannel(spaceId: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/spaces/${enc(spaceId)}/channels`, { method: 'POST', body })
}
export function reorderChannels(
  spaceId: string,
  orderedIds: string[],
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/spaces/${enc(spaceId)}/channels/reorder`, {
    method: 'POST',
    body: { orderedIds },
  })
}
export function updateChannel(id: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/channels/${enc(id)}`, { method: 'PATCH', body })
}
export function deleteChannel(id: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/channels/${enc(id)}`, { method: 'DELETE' })
}

// ── Moderação ──
export function listPending(p: {
  spaceId?: string
  limit?: number
  offset?: number
}): Promise<GatewayResponse<Paginated<HubPendingItemView>>> {
  return gatewayFetch('/hub/admin/pending', {
    query: { spaceId: p.spaceId, limit: p.limit, offset: p.offset },
  })
}
/**
 * Ação por tópico: approve|reject|hide|delete|pin|unpin|lock|unlock. Em `hide`/`reject`
 * um `reason` OPCIONAL vira o RECADO ao aluno quando o post é do Mural kids (canal de
 * retorno — o hub gateia; ver hub §Motivo da moderação). Ausente = moderação silenciosa.
 */
export function threadAction(
  id: string,
  action: string,
  reason?: string,
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/threads/${enc(id)}/${enc(action)}`, {
    method: 'POST',
    ...(reason ? { body: { reason } } : {}),
  })
}
/** Ação por comentário: approve|reject|hide|delete. */
export function commentAction(id: string, action: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/comments/${enc(id)}/${enc(action)}`, { method: 'POST' })
}
export function listReports(p: {
  spaceId?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<GatewayResponse<Paginated<HubReportView>>> {
  return gatewayFetch('/hub/admin/reports', {
    query: { spaceId: p.spaceId, status: p.status, limit: p.limit, offset: p.offset },
  })
}
/** Autoriza o anexo no Hub e resolve a referência privada somente dentro do BFF. */
export function resolveAttachment(id: string): Promise<GatewayResponse<HubResolvedAttachment>> {
  return gatewayFetch(`/hub/admin/attachments/${enc(id)}/resolve`)
}
export function resolveReport(id: string, body: unknown): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/reports/${enc(id)}/resolve`, { method: 'POST', body })
}
export function createMuteBan(
  kind: 'mute' | 'ban',
  body: unknown,
): Promise<GatewayResponse<HubMuteBanView>> {
  return gatewayFetch(`/hub/admin/${kind === 'mute' ? 'mutes' : 'bans'}`, { method: 'POST', body })
}
export function removeMuteBan(
  kind: 'mute' | 'ban',
  body: unknown,
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/hub/admin/${kind === 'mute' ? 'mutes' : 'bans'}/remove`, {
    method: 'POST',
    body,
  })
}
export function listMutesBans(
  spaceId: string,
): Promise<GatewayResponse<{ items: HubMuteBanView[] }>> {
  return gatewayFetch('/hub/admin/mutes-bans', { query: { spaceId } })
}
