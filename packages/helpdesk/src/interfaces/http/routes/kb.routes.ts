import { KNOWLEDGE_AUDIENCES, KNOWLEDGE_PRODUCTS } from '@sistemazero/helpdesk-contracts'
import { Elysia, t } from 'elysia'
import type { KnowledgeAnswerService } from '../../../application/ai/knowledge-answer.service'
import type { KbService } from '../../../application/kb/kb.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
import {
  IdParams,
  KbCreateBody,
  KbPatchBody,
  KbPublishBody,
  KbQuery,
  KbRetryBody,
  KbSearchQuery,
  KbVersionBody,
} from '../dtos'

export interface KbRoutesDeps {
  kb: KbService
  answers: KnowledgeAnswerService
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
    .get(
      '/helpdesk/kb/search',
      ({ query }) => deps.kb.search({ ...query, limit: query.limit ?? 6 }),
      { query: KbSearchQuery },
    )
    .post(
      '/helpdesk/kb/test-answer',
      ({ body }) =>
        deps.answers.answer({
          ...body,
          thread: body.query,
          purpose: 'test',
          ticketId: null,
          generation: null,
          limit: 6,
        }),
      {
        body: t.Object(
          {
            query: t.String({ minLength: 3, maxLength: 8000 }),
            audience: t.Union(KNOWLEDGE_AUDIENCES.map((v) => t.Literal(v))),
            product: t.Union(KNOWLEDGE_PRODUCTS.map((v) => t.Literal(v))),
          },
          { additionalProperties: false },
        ),
      },
    )
    .get('/helpdesk/kb/gaps', () => deps.answers.runs.gaps(100))
    .post(
      '/helpdesk/kb/gaps/:id/resolve',
      async ({ params, body }) => {
        await deps.kb.byId(body.articleId)
        return {
          resolved: await deps.answers.runs.resolveGap(params.id, body.articleId, new Date()),
        }
      },
      {
        params: IdParams,
        body: t.Object(
          { articleId: t.String({ format: 'uuid' }) },
          { additionalProperties: false },
        ),
      },
    )
    .get('/helpdesk/kb/:id', ({ params }) => deps.kb.byId(params.id), { params: IdParams })
    .get('/helpdesk/kb/:id/revisions', ({ params }) => deps.kb.revisions(params.id), {
      params: IdParams,
    })
    .patch(
      '/helpdesk/kb/:id',
      ({ headers, params, body }) => deps.kb.update(resolveActor(headers), params.id, body),
      {
        params: IdParams,
        body: KbPatchBody,
      },
    )
    .post(
      '/helpdesk/kb/:id/publish',
      ({ headers, params, body }) => deps.kb.publish(resolveActor(headers), params.id, body),
      { params: IdParams, body: KbPublishBody },
    )
    .post(
      '/helpdesk/kb/:id/unpublish',
      ({ headers, params, body }) =>
        deps.kb.withdraw(resolveActor(headers), params.id, body.version),
      { params: IdParams, body: KbVersionBody },
    )
    .post(
      '/helpdesk/kb/:id/archive',
      ({ headers, params, body }) =>
        deps.kb.withdraw(resolveActor(headers), params.id, body.version, true),
      { params: IdParams, body: KbVersionBody },
    )
    .post(
      '/helpdesk/kb/:id/retry-index',
      ({ params, body }) => deps.kb.retryIndex(params.id, body.revisionId),
      { params: IdParams, body: KbRetryBody },
    )
}
