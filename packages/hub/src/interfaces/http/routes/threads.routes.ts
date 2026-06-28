import { Elysia } from 'elysia'
import { decodeCursor } from '../../../application/cursor'
import type { ThreadService } from '../../../application/threads/thread.service'
import { assertInternalCaller, resolveActor } from '../auth'
import {
  CommentListQuery,
  CreateCommentBody,
  CreateThreadBody,
  EditBody,
  IdParams,
  ThreadListQuery,
} from '../dtos'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}

export interface ThreadsRoutesDeps {
  threads: ThreadService
  internalToken?: string
}

/**
 * Rotas de TÓPICOS e COMENTÁRIOS do aluno. JWT + conta ativa garantidos pelo
 * gateway; aqui exigimos o `x-internal-token` e resolvemos o ator dos headers.
 */
export function threadsRoutes(deps: ThreadsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get(
      '/hub/channels/:id/threads',
      ({ headers, params, query }) =>
        deps.threads.listThreads(
          resolveActor(headers),
          params.id,
          decodeCursor(query.cursor),
          clampLimit(query.limit),
        ),
      { params: IdParams, query: ThreadListQuery },
    )
    .post(
      '/hub/channels/:id/threads',
      ({ headers, params, body, set }) => {
        set.status = 201
        return deps.threads.createThread(resolveActor(headers), params.id, body)
      },
      { params: IdParams, body: CreateThreadBody },
    )
    .get(
      '/hub/threads/:id',
      ({ headers, params }) => deps.threads.getThread(resolveActor(headers), params.id),
      {
        params: IdParams,
      },
    )
    .patch(
      '/hub/threads/:id',
      ({ headers, params, body }) =>
        deps.threads.editThread(resolveActor(headers), params.id, body.body, body.version),
      { params: IdParams, body: EditBody },
    )
    .get(
      '/hub/threads/:id/comments',
      ({ headers, params, query }) =>
        deps.threads.listComments(
          resolveActor(headers),
          params.id,
          decodeCursor(query.after),
          clampLimit(query.limit),
        ),
      { params: IdParams, query: CommentListQuery },
    )
    .post(
      '/hub/threads/:id/comments',
      ({ headers, params, body, set }) => {
        set.status = 201
        return deps.threads.createComment(resolveActor(headers), params.id, body)
      },
      { params: IdParams, body: CreateCommentBody },
    )
    .patch(
      '/hub/comments/:id',
      ({ headers, params, body }) =>
        deps.threads.editComment(resolveActor(headers), params.id, body.body, body.version),
      { params: IdParams, body: EditBody },
    )
}
