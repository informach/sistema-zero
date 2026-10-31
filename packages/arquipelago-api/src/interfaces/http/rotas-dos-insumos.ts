import { CompraDeInsumosSchema } from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDosInsumos } from '../../application/servico-dos-insumos'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

export function rotasDosInsumos(deps: { insumos: ServicoDosInsumos; tokenInterno?: string }) {
  return new Elysia({ prefix: '/arquipelago/insumos' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('/pendente', ({ headers }) => deps.insumos.pendente(lerJogador(headers)))
    .post('/comprar', ({ headers, body }) => {
      const r = CompraDeInsumosSchema.safeParse(body)
      if (!r.success) throw new CorpoInvalidoError()
      return deps.insumos.comprar(lerJogador(headers), r.data)
    })
}
