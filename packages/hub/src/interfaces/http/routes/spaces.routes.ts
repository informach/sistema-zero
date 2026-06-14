import { Elysia } from 'elysia'
import type { ReadCommunityService } from '../../../application/read-community/read-community.service'
import { assertInternalCaller, resolveActor } from '../auth'
import { AudienceQuery, SlugParams } from '../dtos'

export interface SpacesRoutesDeps {
  read: ReadCommunityService
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → desligado. */
  internalToken?: string
}

/**
 * Rotas de LEITURA do aluno (servidores/canais que ele enxerga). JWT + conta ativa
 * são garantidos pelo gateway; aqui exigimos o `x-internal-token` (defesa em
 * profundidade) e resolvemos o ator dos headers `X-Auth-User-*`.
 */
export function spacesRoutes(deps: SpacesRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get(
      '/hub/spaces',
      ({ headers, query }) =>
        deps.read.listSpaces(resolveActor(headers), query.audience ?? 'adult'),
      { query: AudienceQuery },
    )
    .get(
      '/hub/spaces/:slug',
      ({ headers, params }) => deps.read.getSpace(resolveActor(headers), params.slug),
      {
        params: SlugParams,
      },
    )
    .get(
      '/hub/spaces/:slug/channels',
      ({ headers, params }) => deps.read.listChannels(resolveActor(headers), params.slug),
      { params: SlugParams },
    )
}
