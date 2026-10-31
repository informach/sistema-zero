import { Elysia } from 'elysia'
import type { ServicoDasRoupas } from '../../application/servico-das-roupas'
import { exigirGateway, lerJogador } from './identidade'

/** As roupas conquistadas no jogo (§6.28, A21): o serviço confere e pede ao Members. */
export function rotasDasRoupas(deps: { roupas: ServicoDasRoupas; tokenInterno?: string }) {
  return new Elysia({ prefix: '/arquipelago/roupas' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .post('/sincronizar', ({ headers }) => deps.roupas.sincronizar(lerJogador(headers)))
}
