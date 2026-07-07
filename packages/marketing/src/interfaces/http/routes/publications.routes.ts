import { ValidationError } from '@sistemazero/core/errors'
import { Elysia } from 'elysia'
import type { PublicationService } from '../../../application/publications/publication.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { parseIsoDate } from '../dates'
import {
  IdParams,
  MarkPublishedBody,
  PublicationPatchBody,
  PublicationsCreateBody,
  ScheduleBody,
} from '../dtos'

export interface PublicationsRoutesDeps {
  publications: PublicationService
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
          version: body.version,
        }),
      { params: IdParams, body: PublicationPatchBody },
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
}
