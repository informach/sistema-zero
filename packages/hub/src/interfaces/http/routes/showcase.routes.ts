import { Elysia, t } from 'elysia'
import type { DeliverStudioCleanupsService } from '../../../application/showcase/deliver-studio-cleanups.service'
import type { DeliverStudioReservationCleanupsService } from '../../../application/showcase/deliver-studio-reservation-cleanups.service'
import type { GetShowcaseDeliveryService } from '../../../application/showcase/get-showcase-delivery.service'
import type { ShowcaseService } from '../../../application/showcase/showcase.service'
import { assertInternalCaller, resolveActor } from '../auth'
import {
  PlayIdParams,
  PlayResolveQuery,
  ShowcaseThreadBody,
  ShowcaseThreadStudioBody,
  ShowcaseThreadStudioPrepareBody,
  ShowcaseThreadStudioStandaloneBody,
  ShowcaseThreadStudioStandalonePrepareBody,
} from '../dtos'

export interface ShowcaseRoutesDeps {
  cleanups: DeliverStudioCleanupsService
  reservationCleanups: DeliverStudioReservationCleanupsService
  delivery: GetShowcaseDeliveryService
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
      '/hub/internal/showcase-thread-studio/prepare',
      async ({ headers, body }) =>
        deps.showcase.prepareFromStudio(resolveActor(headers), {
          ...body,
          playId: '',
          coverImageUrl: null,
        }),
      { body: ShowcaseThreadStudioPrepareBody },
    )
    .post(
      '/hub/internal/showcase-thread-studio-standalone/prepare',
      async ({ headers, body }) =>
        deps.showcase.prepareStandaloneShowcase(resolveActor(headers), {
          ...body,
          playId: body.liveWorkspace?.playId ?? '',
          coverImageUrl: null,
        }),
      { body: ShowcaseThreadStudioStandalonePrepareBody },
    )
    .post(
      '/hub/internal/showcase-thread-studio',
      async ({ headers, body }) => {
        // Kid-driven (botão Compartilhar do Estúdio): descrição da criança + link
        // público de jogar. Mesmas guardas; título/elegibilidade do members.
        const { thread, deduped } = await deps.showcase.createFromStudio(resolveActor(headers), {
          reservationId: body.reservationId,
          snapshotHash: body.snapshotHash,
          publisher: body.publisher,
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
            reservationId: body.reservationId,
            snapshotHash: body.snapshotHash,
            publisher: body.publisher,
            spaceSlug: body.spaceSlug,
            title: body.title,
            description: body.description,
            coverImageUrl: body.coverImageUrl ?? null,
            playId: body.playId,
            clientIdempotencyKey: body.clientIdempotencyKey,
            challengeKey: body.challengeKey ?? null,
            studioMeta: body.studioMeta ?? null,
            liveWorkspace: body.liveWorkspace,
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
          query.audience ?? 'kids',
        )
        return {
          visible,
          authorDisplayName,
          ...(query.audience === 'adult' ? { audience: 'adult' as const } : {}),
        }
      },
      { params: PlayIdParams, query: PlayResolveQuery },
    )
    .get(
      '/hub/internal/studio-cover/:playId',
      ({ params, query }) => deps.showcase.showcaseCoverReference(params.playId, query.audience),
      {
        params: PlayIdParams,
        query: t.Object({ audience: t.Union([t.Literal('kids'), t.Literal('adult')]) }),
      },
    )
    .post(
      '/hub/internal/studio-artifact-cleanups/drain',
      async ({ body }) => deps.cleanups.drain(body.audience),
      {
        body: t.Object(
          { audience: t.Union([t.Literal('kids'), t.Literal('adult')]) },
          { additionalProperties: false },
        ),
      },
    )
    .post(
      '/hub/internal/studio-reservation-cleanups/drain',
      async ({ body }) => deps.reservationCleanups.drain(body.audience),
      {
        body: t.Object(
          { audience: t.Union([t.Literal('kids'), t.Literal('adult')]) },
          { additionalProperties: false },
        ),
      },
    )
    .get('/hub/my-showcase-stats', async ({ headers }) => {
      // Rota de ALUNO (JWT no gateway; aqui o token interno + ator dos headers):
      // agregado da jornada — "seus jogos já foram jogados N vezes".
      return deps.showcase.myShowcaseStats(resolveActor(headers))
    })
    .get(
      '/hub/my-showcase-delivery/:courseId',
      ({ headers, params }) => deps.delivery.execute(resolveActor(headers), params.courseId),
      { params: t.Object({ courseId: t.String({ format: 'uuid' }) }) },
    )
}
