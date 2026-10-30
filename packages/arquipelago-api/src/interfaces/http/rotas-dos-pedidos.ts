import { EntregarPedidoSchema } from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDosPedidos } from '../../application/servico-dos-pedidos'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

export function rotasDosPedidos(deps: { pedidos: ServicoDosPedidos; tokenInterno?: string }) {
  return new Elysia({ prefix: '/arquipelago/pedidos' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('/pendentes', ({ headers }) => deps.pedidos.pendentes(lerJogador(headers)))
    .post('/entregar', ({ headers, body }) => {
      const r = EntregarPedidoSchema.safeParse(body)
      if (!r.success) throw new CorpoInvalidoError()
      return deps.pedidos.entregar(lerJogador(headers), r.data)
    })
}
