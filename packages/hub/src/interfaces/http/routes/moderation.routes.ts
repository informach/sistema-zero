import { Elysia } from 'elysia'
import type { ModerationService } from '../../../application/moderation/moderation.service'
import { assertInternalCaller, requireAdmin, resolveDisplayName, resolveUserId } from '../auth'
import {
  IdParams,
  MuteBanBody,
  PendingQuery,
  ReportsQuery,
  ResolveReportBody,
  SpaceIdQuery,
  UnMuteBanBody,
} from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const clampLimit = (l: number | undefined) =>
  l === undefined ? DEFAULT_LIMIT : Math.min(Math.max(1, l), MAX_LIMIT)

/**
 * Motivo OPCIONAL da moderação (esconder/recusar um jogo do Mural) → vira o recado ao
 * aluno. Lido do corpo SEM schema (as rotas hoje são POST sem corpo — um schema
 * obrigatório quebraria os chamadores existentes); trim + teto de 1000 (espelha o
 * members). Corpo ausente/sem `reason` = moderação silenciosa (comportamento antigo).
 */
function reasonFromBody(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const raw = (body as { reason?: unknown }).reason
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed ? trimmed.slice(0, 1000) : undefined
}

export interface ModerationRoutesDeps {
  requireAdminEnabled: boolean
  internalToken?: string
  moderation: ModerationService
}

/**
 * Rotas ADMIN de MODERAÇÃO (fila de aprovação + denúncias + ocultar/apagar +
 * fixar/trancar + silenciar/banir). Mesmo gating do admin de estrutura
 * (`requireAdmin` + `x-internal-token`); prefixo `/hub/admin`.
 */
export function moderationRoutes(deps: ModerationRoutesDeps) {
  const guardId = (headers: Record<string, string | undefined>): string => {
    requireAdmin(headers, deps.requireAdminEnabled)
    return resolveUserId(headers)
  }
  const m = deps.moderation

  return (
    new Elysia({ prefix: '/hub/admin' })
      .onBeforeHandle(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      // ── Fila de aprovação ──
      .get(
        '/pending',
        ({ headers, query }) => {
          guardId(headers)
          return m.listPending({
            spaceId: query.spaceId,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: PendingQuery },
      )
      .post(
        '/threads/:id/approve',
        ({ headers, params }) => m.approveThread(guardId(headers), params.id),
        {
          params: IdParams,
        },
      )
      .post(
        '/threads/:id/reject',
        ({ headers, params, body }) =>
          m.rejectThread(
            guardId(headers),
            params.id,
            reasonFromBody(body),
            resolveDisplayName(headers),
          ),
        {
          params: IdParams,
        },
      )
      .post(
        '/comments/:id/approve',
        ({ headers, params }) => m.approveComment(guardId(headers), params.id),
        {
          params: IdParams,
        },
      )
      .post(
        '/comments/:id/reject',
        ({ headers, params }) => m.rejectComment(guardId(headers), params.id),
        {
          params: IdParams,
        },
      )
      // ── Ocultar / apagar ──
      .post(
        '/threads/:id/hide',
        ({ headers, params, body }) =>
          m.hideThread(
            guardId(headers),
            params.id,
            reasonFromBody(body),
            resolveDisplayName(headers),
          ),
        {
          params: IdParams,
        },
      )
      .post(
        '/threads/:id/delete',
        ({ headers, params }) => m.deleteThread(guardId(headers), params.id),
        {
          params: IdParams,
        },
      )
      .post(
        '/comments/:id/hide',
        ({ headers, params }) => m.hideComment(guardId(headers), params.id),
        {
          params: IdParams,
        },
      )
      .post(
        '/comments/:id/delete',
        ({ headers, params }) => m.deleteComment(guardId(headers), params.id),
        {
          params: IdParams,
        },
      )
      // ── Fixar / trancar ──
      .post(
        '/threads/:id/pin',
        ({ headers, params }) => m.setPinned(guardId(headers), params.id, true),
        {
          params: IdParams,
        },
      )
      .post(
        '/threads/:id/unpin',
        ({ headers, params }) => m.setPinned(guardId(headers), params.id, false),
        {
          params: IdParams,
        },
      )
      .post(
        '/threads/:id/lock',
        ({ headers, params }) => m.setLocked(guardId(headers), params.id, true),
        {
          params: IdParams,
        },
      )
      .post(
        '/threads/:id/unlock',
        ({ headers, params }) => m.setLocked(guardId(headers), params.id, false),
        {
          params: IdParams,
        },
      )
      // ── Denúncias ──
      .get(
        '/reports',
        ({ headers, query }) => {
          guardId(headers)
          return m.listReports({
            spaceId: query.spaceId,
            status: query.status,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ReportsQuery },
      )
      .post(
        '/reports/:id/resolve',
        ({ headers, params, body }) => m.resolveReport(guardId(headers), params.id, body.action),
        { params: IdParams, body: ResolveReportBody },
      )
      // ── Silenciar / banir ──
      .post('/mutes', ({ headers, body }) => m.createMuteBan(guardId(headers), 'mute', body), {
        body: MuteBanBody,
      })
      .post('/bans', ({ headers, body }) => m.createMuteBan(guardId(headers), 'ban', body), {
        body: MuteBanBody,
      })
      .post(
        '/mutes/remove',
        ({ headers, body }) => m.removeMuteBan(guardId(headers), 'mute', body.userId, body.spaceId),
        { body: UnMuteBanBody },
      )
      .post(
        '/bans/remove',
        ({ headers, body }) => m.removeMuteBan(guardId(headers), 'ban', body.userId, body.spaceId),
        { body: UnMuteBanBody },
      )
      .get(
        '/mutes-bans',
        ({ headers, query }) => {
          guardId(headers)
          return m.listMutesBans(query.spaceId)
        },
        { query: SpaceIdQuery },
      )
  )
}
