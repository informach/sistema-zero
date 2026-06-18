import { Elysia } from 'elysia'
import type { ShowcaseService } from '../../../application/showcase/showcase.service'
import { assertInternalCaller, resolveActor } from '../auth'
import { ShowcaseThreadBody } from '../dtos'

export interface ShowcaseRoutesDeps {
  showcase: ShowcaseService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → desligado. */
  internalToken?: string
}

/**
 * Auto-publicação de projeto no Mural (chamada INTERNA pelo BFF em nome da criança).
 * Exige o `x-internal-token` (fronteira de confiança — a elegibilidade foi validada
 * no members upstream) e resolve o `authorId` dos headers `X-Auth-User-*` do gateway.
 * Idempotente: re-publicar devolve o post existente (200), nunca duplica.
 */
export function showcaseRoutes(deps: ShowcaseRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post(
      '/hub/internal/showcase-thread',
      async ({ headers, body }) => {
        const { thread, deduped } = await deps.showcase.create(resolveActor(headers), {
          spaceSlug: body.spaceSlug,
          authorDisplayName: body.authorDisplayName,
          title: body.title,
          summary: body.summary,
          coverImageUrl: body.coverImageUrl ?? null,
          idempotencyKey: body.idempotencyKey,
        })
        return { thread, deduped }
      },
      { body: ShowcaseThreadBody },
    )
}
