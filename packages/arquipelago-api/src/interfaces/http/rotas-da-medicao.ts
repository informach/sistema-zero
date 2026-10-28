import { Elysia } from 'elysia'
import type { ServicoDaMedicao } from '../../application/servico-da-medicao'
import { exigirGateway, lerEquipe } from './identidade'

export function rotasDaMedicao(deps: { medicao: ServicoDaMedicao; tokenInterno?: string }) {
  return new Elysia({ prefix: '/arquipelago/equipe' })
    .onBeforeHandle(({ headers }) => {
      exigirGateway(headers['x-internal-token'], deps.tokenInterno)
      lerEquipe(headers)
    })
    .get('/medicao', ({ query, set }) => {
      set.headers['cache-control'] = 'private, no-store'
      return deps.medicao.ler(query)
    })
}
