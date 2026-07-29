import { Elysia } from 'elysia'
import type { ShowcaseService } from '../../../application/showcase/showcase.service'
import { assertInternalCaller, resolveActor } from '../auth'
import {
  PlayIdParams,
  PlayResolveQuery,
  ShowcaseThreadBody,
  ShowcaseThreadStudioBody,
  ShowcaseThreadStudioStandaloneBody,
} from '../dtos'

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
        // Conteúdo/elegibilidade/nome/idempotência são resolvidos no service (members
        // S2S + header de perfil do gateway) — o corpo só diz QUAL projeto e a capa.
        const { thread, deduped } = await deps.showcase.create(resolveActor(headers), {
          spaceSlug: body.spaceSlug,
          lessonId: body.lessonId,
          blockId: body.blockId,
          coverImageUrl: body.coverImageUrl ?? null,
        })
        return { thread, deduped }
      },
      { body: ShowcaseThreadBody },
    )
    .post(
      '/hub/internal/showcase-thread-studio',
      async ({ headers, body }) => {
        // Kid-driven (botão Compartilhar do Estúdio): descrição da criança + link
        // público de jogar. Mesmas guardas; título/elegibilidade do members.
        const { thread, deduped } = await deps.showcase.createFromStudio(resolveActor(headers), {
          spaceSlug: body.spaceSlug,
          lessonId: body.lessonId,
          blockId: body.blockId,
          coverImageUrl: body.coverImageUrl ?? null,
          description: body.description,
          playId: body.playId,
          clientIdempotencyKey: body.clientIdempotencyKey,
          studioMeta: body.studioMeta ?? null,
        })
        return { thread, deduped }
      },
      { body: ShowcaseThreadStudioBody },
    )
    .post(
      '/hub/internal/showcase-thread-studio-standalone',
      async ({ headers, body }) => {
        // Estúdio COMPLETO (produto, sem aula): título + descrição da criança; a
        // elegibilidade é a posse do produto (members.checkAccess no service).
        const { thread, deduped } = await deps.showcase.createStandaloneShowcase(
          resolveActor(headers),
          {
            spaceSlug: body.spaceSlug,
            title: body.title,
            description: body.description,
            coverImageUrl: body.coverImageUrl ?? null,
            playId: body.playId,
            clientIdempotencyKey: body.clientIdempotencyKey,
            challengeKey: body.challengeKey ?? null,
            studioMeta: body.studioMeta ?? null,
          },
        )
        return { thread, deduped }
      },
      { body: ShowcaseThreadStudioStandaloneBody },
    )
    .get(
      '/hub/internal/studio-play/:playId',
      async ({ params, query }) => {
        // `count=1` funde o incremento de jogadas no MESMO round-trip (o BFF já
        // deduplicou por ip:playId — só hits "novos" chegam com count). Devolve o
        // 1º nome do autor p/ a página pública mostrar "feito por {nome}".
        const { visible, authorDisplayName } = await deps.showcase.isPlayable(
          params.playId,
          query.count === '1',
        )
        return { visible, authorDisplayName }
      },
      { params: PlayIdParams, query: PlayResolveQuery },
    )
    .get('/hub/my-showcase-stats', async ({ headers }) => {
      // Rota de ALUNO (JWT no gateway; aqui o token interno + ator dos headers):
      // agregado da carreira — "seus jogos já foram jogados N vezes".
      return deps.showcase.myShowcaseStats(resolveActor(headers))
    })
}
