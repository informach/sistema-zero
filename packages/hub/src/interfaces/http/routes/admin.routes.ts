import { Elysia } from 'elysia'
import type {
  ChannelAdminService,
  SpaceAdminService,
} from '../../../application/community-admin/community-admin.service'
import { normalizeAccessConfig } from '../../../domain/access/access-config'
import type {
  ChannelFields,
  SpaceFields,
} from '../../../domain/ports/community-admin-repository.port'
import { assertInternalCaller, requireAdmin } from '../auth'
import {
  ChannelBody,
  IdParams,
  ListSpacesQuery,
  ReorderBody,
  ReorderSpacesBody,
  SpaceBody,
} from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface AdminRoutesDeps {
  requireAdminEnabled: boolean
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → desligado. */
  internalToken?: string
  spaces: SpaceAdminService
  channels: ChannelAdminService
}

type SpaceInput = typeof SpaceBody.static
type ChannelInput = typeof ChannelBody.static

const spaceFields = (b: SpaceInput): SpaceFields => ({
  slug: b.slug,
  name: b.name,
  description: b.description ?? null,
  iconUrl: b.iconUrl ?? null,
  audience: b.audience,
  accessConfig: normalizeAccessConfig({
    visibility: b.accessConfig.visibility,
    courses: b.accessConfig.courses ?? [],
    roles: b.accessConfig.roles ?? [],
  }),
  // Pré-moderação: kids nasce ligada por padrão (decisão de segurança).
  requiresApproval: b.requiresApproval ?? b.audience === 'kids',
  teaserWhenLocked: b.teaserWhenLocked ?? false,
  status: b.status ?? 'active',
})

const channelFields = (b: ChannelInput): ChannelFields => ({
  slug: b.slug,
  name: b.name,
  topic: b.topic ?? null,
  accessConfig: b.accessConfig
    ? normalizeAccessConfig({
        visibility: b.accessConfig.visibility,
        courses: b.accessConfig.courses ?? [],
        roles: b.accessConfig.roles ?? [],
      })
    : null,
  postingPolicy: b.postingPolicy ?? 'members',
  requiresApproval: b.requiresApproval ?? null,
  status: b.status ?? 'active',
})

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}

/**
 * Rotas ADMIN da estrutura da comunidade (servidores → canais + reordenação).
 * Gating: `requireAdmin` (X-Auth-User-* do gateway) + `x-internal-token` (defesa em
 * profundidade); o RBAC real é do gateway. Prefixo `/hub/admin`.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>) =>
    requireAdmin(headers, deps.requireAdminEnabled)

  return (
    new Elysia({ prefix: '/hub/admin' })
      .onBeforeHandle(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      // ── Servidores ──
      .get(
        '/spaces',
        async ({ query, headers }) => {
          guard(headers)
          return deps.spaces.list({
            q: query.q,
            audience: query.audience,
            status: query.status,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListSpacesQuery },
      )
      .post(
        '/spaces',
        async ({ body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.spaces.create(spaceFields(body))
        },
        { body: SpaceBody },
      )
      // Reorder ANTES de `/spaces/:id` (literal vence o param p/ POST distinto).
      .post(
        '/spaces/reorder',
        async ({ body, headers }) => {
          guard(headers)
          return deps.spaces.reorder(body.audience, body.orderedIds)
        },
        { body: ReorderSpacesBody },
      )
      .get(
        '/spaces/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.spaces.get(params.id)
        },
        { params: IdParams },
      )
      .patch(
        '/spaces/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.spaces.update(params.id, spaceFields(body))
        },
        { params: IdParams, body: SpaceBody },
      )
      .delete(
        '/spaces/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.spaces.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Canais ──
      .post(
        '/spaces/:id/channels',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.channels.create(params.id, channelFields(body))
        },
        { params: IdParams, body: ChannelBody },
      )
      .post(
        '/spaces/:id/channels/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.channels.reorder(params.id, body.orderedIds)
        },
        { params: IdParams, body: ReorderBody },
      )
      .patch(
        '/channels/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.channels.update(params.id, channelFields(body))
        },
        { params: IdParams, body: ChannelBody },
      )
      .delete(
        '/channels/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.channels.remove(params.id)
        },
        { params: IdParams },
      )
  )
}
