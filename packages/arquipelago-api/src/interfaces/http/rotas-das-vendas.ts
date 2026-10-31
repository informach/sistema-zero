import { VenderNaFeiraSchema } from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDasVendas } from '../../application/servico-das-vendas'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

/** A banca da feira (§6.28, A22). */
export function rotasDasVendas(deps: { vendas: ServicoDasVendas; tokenInterno?: string }) {
  return new Elysia({ prefix: '/arquipelago/feira' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('/vendas/pendentes', ({ headers }) => deps.vendas.pendentes(lerJogador(headers)))
    .post('/vender', ({ headers, body }) => {
      const r = VenderNaFeiraSchema.safeParse(body)
      if (!r.success) throw new CorpoInvalidoError()
      return deps.vendas.vender(lerJogador(headers), r.data)
    })
}
