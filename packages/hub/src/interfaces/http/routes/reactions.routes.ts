import { Elysia } from 'elysia'
import type { ReactionService } from '../../../application/reactions/reaction.service'
import type { ReadStateService } from '../../../application/read-state/read-state.service'
import { assertInternalCaller, resolveActor } from '../auth'
import { EmojiParams, IdParams, ReactBody } from '../dtos'

export interface ReactionsRoutesDeps {
  reactions: ReactionService
  readState: ReadStateService
  internalToken?: string
}

/** Decodifica o emoji do path (cliente faz encodeURIComponent); fallback ao bruto. */
function decodeEmoji(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Reações (tópico/comentário) + marcar canal como visto. */
export function reactionsRoutes(deps: ReactionsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post(
      '/hub/threads/:id/reactions',
      ({ headers, params, body }) =>
        deps.reactions.react(resolveActor(headers), 'thread', params.id, body.emoji),
      { params: IdParams, body: ReactBody },
    )
    .delete(
      '/hub/threads/:id/reactions/:emoji',
      ({ headers, params }) =>
        deps.reactions.unreact(
          resolveActor(headers),
          'thread',
          params.id,
          decodeEmoji(params.emoji),
        ),
      { params: EmojiParams },
    )
    .post(
      '/hub/comments/:id/reactions',
      ({ headers, params, body }) =>
        deps.reactions.react(resolveActor(headers), 'comment', params.id, body.emoji),
      { params: IdParams, body: ReactBody },
    )
    .delete(
      '/hub/comments/:id/reactions/:emoji',
      ({ headers, params }) =>
        deps.reactions.unreact(
          resolveActor(headers),
          'comment',
          params.id,
          decodeEmoji(params.emoji),
        ),
      { params: EmojiParams },
    )
    .post(
      '/hub/channels/:id/seen',
      ({ headers, params }) => deps.readState.markSeen(resolveActor(headers), params.id),
      { params: IdParams },
    )
}
