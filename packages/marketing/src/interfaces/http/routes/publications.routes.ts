import { ValidationError } from '@sistemazero/core/errors'
import { Elysia } from 'elysia'
import type { LinkExternalService } from '../../../application/publications/link-external.service'
import type { PublicationService } from '../../../application/publications/publication.service'
import type { PublicationStatus } from '../../../domain/publication/publication'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { parseIsoDate } from '../dates'
import {
  IdParams,
  LinkExternalBody,
  MarkPublishedBody,
  PublicationAssetsBody,
  PublicationPatchBody,
  PublicationsCreateBody,
  PublicationsListQuery,
  ScheduleBody,
} from '../dtos'

const PUB_STATUSES: ReadonlySet<string> = new Set([
  'draft',
  'ready',
  'scheduled',
  'publishing',
  'awaiting_manual',
  'published',
  'failed',
  'canceled',
])

/** CSV de status → array validado (token inválido → 400, nunca filtro silencioso). */
function parseStatusCsv(csv: string | undefined): PublicationStatus[] | undefined {
  if (!csv) return undefined
  const tokens = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const token of tokens) {
    if (!PUB_STATUSES.has(token)) {
      throw new ValidationError(`Status de publicação inválido: "${token}"`)
    }
  }
  return tokens as PublicationStatus[]
}

export interface PublicationsRoutesDeps {
  publications: PublicationService
  linkExternal: LinkExternalService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Publicações (cross-post por rede/formato) de um conteúdo aprovado. */
export function publicationsRoutes(deps: PublicationsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .post(
      '/marketing/contents/:id/publications',
      async ({ headers, params, body, set }) => {
        set.status = 201
        return deps.publications.createForContent(resolveActor(headers), params.id, body)
      },
      { params: IdParams, body: PublicationsCreateBody },
    )
    .get(
      '/marketing/publications',
      async ({ query }) => {
        const offset = query.offset ?? 0
        const page = await deps.publications.listByWindow({
          from: parseIsoDate(query.from) ?? undefined,
          to: parseIsoDate(query.to) ?? undefined,
          statuses: parseStatusCsv(query.status),
          network: query.network,
          format: query.format,
          contentId: query.contentId,
          limit: query.limit ?? 100,
          offset,
        })
        return { ...page, hasMore: offset + page.items.length < page.total }
      },
      { query: PublicationsListQuery },
    )
    .get('/marketing/publications/:id', ({ params }) => deps.publications.get(params.id), {
      params: IdParams,
    })
    .patch(
      '/marketing/publications/:id',
      ({ params, body }) =>
        deps.publications.update(params.id, {
          caption: body.caption,
          title: body.title,
          tags: body.tags,
          coverAssetId: body.coverAssetId,
          scheduledAt: body.scheduledAt === undefined ? undefined : parseIsoDate(body.scheduledAt),
          publishMode: body.publishMode,
          socialAccountId: body.socialAccountId,
          version: body.version,
        }),
      { params: IdParams, body: PublicationPatchBody },
    )
    .put(
      '/marketing/publications/:id/assets',
      ({ params, body }) => deps.publications.setAssets(params.id, body.assetIds),
      { params: IdParams, body: PublicationAssetsBody },
    )
    .post(
      '/marketing/publications/:id/schedule',
      ({ headers, params, body }) => {
        const scheduledAt = parseIsoDate(body.scheduledAt)
        if (!scheduledAt) throw new ValidationError('scheduledAt é obrigatório')
        return deps.publications.schedule(resolveActor(headers), params.id, scheduledAt)
      },
      { params: IdParams, body: ScheduleBody },
    )
    .post(
      '/marketing/publications/:id/cancel',
      ({ headers, params }) => deps.publications.cancel(resolveActor(headers), params.id),
      { params: IdParams },
    )
    .post(
      '/marketing/publications/:id/mark-published',
      ({ headers, params, body }) =>
        deps.publications.markPublished(resolveActor(headers), params.id, body),
      { params: IdParams, body: MarkPublishedBody },
    )
    .post(
      '/marketing/publications/:id/link-external',
      ({ params, body }) => deps.linkExternal.link(params.id, body.url),
      { params: IdParams, body: LinkExternalBody },
    )
}
