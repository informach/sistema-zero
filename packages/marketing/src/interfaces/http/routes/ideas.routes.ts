import { Elysia } from 'elysia'
import type { IdeaService } from '../../../application/ideas/idea.service'
import type { PromoteIdeaService } from '../../../application/ideas/promote-idea.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import { IdeaBody, IdeaPatchBody, IdeasQuery, IdParams, PromoteIdeaBody } from '../dtos'

export interface IdeasRoutesDeps {
  ideas: IdeaService
  promote: PromoteIdeaService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Inbox de ideias da equipe. */
export function ideasRoutes(deps: IdeasRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get(
      '/marketing/ideas',
      async ({ query }) => {
        const offset = query.offset ?? 0
        const page = await deps.ideas.list({
          status: query.status,
          limit: query.limit ?? 50,
          offset,
        })
        return { ...page, hasMore: offset + page.items.length < page.total }
      },
      { query: IdeasQuery },
    )
    .post(
      '/marketing/ideas',
      async ({ headers, body, set }) => {
        set.status = 201
        return deps.ideas.create(resolveActor(headers), body)
      },
      { body: IdeaBody },
    )
    .patch('/marketing/ideas/:id', ({ params, body }) => deps.ideas.update(params.id, body), {
      params: IdParams,
      body: IdeaPatchBody,
    })
    .post(
      '/marketing/ideas/:id/promote',
      async ({ headers, params, body, set }) => {
        set.status = 201
        return deps.promote.promote(resolveActor(headers), params.id, body)
      },
      { params: IdParams, body: PromoteIdeaBody },
    )
}
