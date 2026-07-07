import { Elysia } from 'elysia'
import type { MediaService } from '../../../application/media/media.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { AssetPatchBody, AssetsQuery, IdParams, PresignBody } from '../dtos'

export interface MediaRoutesDeps {
  media: MediaService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Biblioteca de mídia: presign (upload direto browser→R2), confirm e resolve. */
export function mediaRoutes(deps: MediaRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .post(
      '/marketing/media/presign',
      async ({ headers, body, set }) => {
        set.status = 201
        return deps.media.presign(resolveActor(headers), {
          filename: body.filename,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
          contentId: body.contentId ?? null,
          kind: body.kind,
        })
      },
      { body: PresignBody },
    )
    .post('/marketing/media/:id/confirm', ({ params }) => deps.media.confirm(params.id), {
      params: IdParams,
    })
    .get('/marketing/media/:id/resolve', ({ params }) => deps.media.resolve(params.id), {
      params: IdParams,
    })
    .get(
      '/marketing/media',
      async ({ query }) => {
        const offset = query.offset ?? 0
        const page = await deps.media.list({
          contentId: query.contentId,
          limit: query.limit ?? 50,
          offset,
        })
        return { ...page, hasMore: offset + page.items.length < page.total }
      },
      { query: AssetsQuery },
    )
    .patch('/marketing/media/:id', ({ params, body }) => deps.media.attach(params.id, body), {
      params: IdParams,
      body: AssetPatchBody,
    })
}
