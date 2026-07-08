import { Elysia } from 'elysia'
import type { KbService } from '../../../application/kb/kb.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { IdParams, KbCreateBody, KbPatchBody, KbQuery } from '../dtos'

export interface KbRoutesDeps {
  kb: KbService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Base de conhecimento (artigos que alimentam o prompt da IA). */
export function kbRoutes(deps: KbRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get(
      '/helpdesk/kb',
      async ({ query }) => {
        const offset = query.offset ?? 0
        const page = await deps.kb.list({ limit: query.limit ?? 50, offset })
        return { ...page, hasMore: offset + page.items.length < page.total }
      },
      { query: KbQuery },
    )
    .post(
      '/helpdesk/kb',
      async ({ headers, body, set }) => {
        set.status = 201
        return deps.kb.create(resolveActor(headers), body)
      },
      { body: KbCreateBody },
    )
    .get('/helpdesk/kb/:id', ({ params }) => deps.kb.byId(params.id), { params: IdParams })
    .patch('/helpdesk/kb/:id', ({ params, body }) => deps.kb.update(params.id, body), {
      params: IdParams,
      body: KbPatchBody,
    })
    .delete(
      '/helpdesk/kb/:id',
      async ({ params, set }) => {
        await deps.kb.delete(params.id)
        set.status = 204
      },
      { params: IdParams },
    )
}
