import { CompraNaGaleriaSchema } from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDaGaleria } from '../../application/servico-da-galeria'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

/**
 * A galeria (fase1-13, 29/10/2026): `GET /arquipelago/galeria` (o que ela já comprou e o saldo) e
 * `POST /arquipelago/galeria/compras` (`{aparencia, chave}`). Quem é a pessoa vem SEMPRE dos
 * `x-auth-*` do gateway; o preço vem do catálogo do contrato, nunca do corpo.
 */
export function rotasDaGaleria(deps: { galeria: ServicoDaGaleria; tokenInterno?: string }) {
  const { galeria } = deps
  return new Elysia({ prefix: '/arquipelago/galeria' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('', ({ headers }) => galeria.ler(lerJogador(headers)))
    .post('/compras', ({ headers, body }) => {
      const pedido = CompraNaGaleriaSchema.safeParse(body)
      if (!pedido.success) throw new CorpoInvalidoError()
      return galeria.comprar(lerJogador(headers), pedido.data)
    })
}
