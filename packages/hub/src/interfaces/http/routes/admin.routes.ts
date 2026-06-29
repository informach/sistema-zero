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
  ChannelPatchBody,
  IdParams,
  ListSpacesQuery,
  ReorderBody,
  ReorderSpacesBody,
  SpaceBody,
  SpacePatchBody,
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
type SpacePatchInput = typeof SpacePatchBody.static
type ChannelInput = typeof ChannelBody.static
type ChannelPatchInput = typeof ChannelPatchBody.static

const normalizeAccess = (accessConfig: NonNullable<SpaceInput['accessConfig']>) =>
  normalizeAccessConfig({
    visibility: accessConfig.visibility,
    courses: accessConfig.courses ?? [],
    communities: accessConfig.communities ?? [],
    roles: accessConfig.roles ?? [],
  })

const spaceFields = (b: SpaceInput): SpaceFields => ({
  slug: b.slug,
  name: b.name,
  description: b.description ?? null,
  iconUrl: b.iconUrl ?? null,
  audience: b.audience,
  accessConfig: normalizeAccess(b.accessConfig),
  // Pré-moderação: kids nasce ligada por padrão (decisão de segurança).
  requiresApproval: b.requiresApproval ?? b.audience === 'kids',
  teaserWhenLocked: b.teaserWhenLocked ?? false,
  status: b.status ?? 'active',
})

const spacePatchFields = (b: SpacePatchInput): Partial<SpaceFields> => ({
  ...(b.slug !== undefined ? { slug: b.slug } : {}),
  ...(b.name !== undefined ? { name: b.name } : {}),
  ...(b.description !== undefined ? { description: b.description ?? null } : {}),
  ...(b.iconUrl !== undefined ? { iconUrl: b.iconUrl ?? null } : {}),
  ...(b.audience !== undefined ? { audience: b.audience } : {}),
  ...(b.accessConfig !== undefined ? { accessConfig: normalizeAccess(b.accessConfig) } : {}),
  ...(b.requiresApproval !== undefined ? { requiresApproval: b.requiresApproval } : {}),
  ...(b.teaserWhenLocked !== undefined ? { teaserWhenLocked: b.teaserWhenLocked } : {}),
  ...(b.status !== undefined ? { status: b.status } : {}),
})

const channelFields = (b: ChannelInput): ChannelFields => ({
  slug: b.slug,
  name: b.name,
  topic: b.topic ?? null,
  accessConfig: b.accessConfig
    ? normalizeAccessConfig({
        visibility: b.accessConfig.visibility,
        courses: b.accessConfig.courses ?? [],
        communities: b.accessConfig.communities ?? [],
        roles: b.accessConfig.roles ?? [],
      })
    : null,
  postingPolicy: b.postingPolicy ?? 'members',
  requiresApproval: b.requiresApproval ?? null,
  status: b.status ?? 'active',
})

const channelPatchFields = (b: ChannelPatchInput): Partial<ChannelFields> => ({
  ...(b.slug !== undefined ? { slug: b.slug } : {}),
  ...(b.name !== undefined ? { name: b.name } : {}),
  ...(b.topic !== undefined ? { topic: b.topic ?? null } : {}),
  ...(b.accessConfig !== undefined
    ? {
        accessConfig: b.accessConfig
          ? normalizeAccessConfig({
              visibility: b.accessConfig.visibility,
              courses: b.accessConfig.courses ?? [],
              communities: b.accessConfig.communities ?? [],
              roles: b.accessConfig.roles ?? [],
            })
          : null,
      }
    : {}),
  ...(b.postingPolicy !== undefined ? { postingPolicy: b.postingPolicy } : {}),
  ...(b.requiresApproval !== undefined ? { requiresApproval: b.requiresApproval ?? null } : {}),
  ...(b.status !== undefined ? { status: b.status } : {}),
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
          return deps.spaces.update(params.id, spacePatchFields(body), body.version)
        },
        { params: IdParams, body: SpacePatchBody },
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
          return deps.channels.update(params.id, channelPatchFields(body), body.version)
        },
        { params: IdParams, body: ChannelPatchBody },
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
