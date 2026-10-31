import {
  CORPO_DA_OBRA_ESTENDIDA_MAX_BYTES,
  GravarObraEstendidaSchema,
} from '@sistemazero/arquipelago-contracts'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { ServicoDaObraEstendida } from '../../application/servico-da-obra-estendida'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

export function rotasDaObraEstendida(deps: {
  obraEstendida: ServicoDaObraEstendida
  tokenInterno?: string
}) {
  return new Elysia({ prefix: '/arquipelago' })
    .onBeforeHandle(({ headers, set }) => {
      exigirGateway(headers['x-internal-token'], deps.tokenInterno)
      set.headers['cache-control'] = 'private, no-store'
    })
    .get('/obra-estendida', ({ headers }) => deps.obraEstendida.ler(lerJogador(headers)))
    .put(
      '/obra-estendida',
      async ({ headers, request }) => {
        const body = await readJsonBodyWithLimit(
          request,
          CORPO_DA_OBRA_ESTENDIDA_MAX_BYTES,
          request.signal,
        )
        const pedido = GravarObraEstendidaSchema.safeParse(body)
        if (!pedido.success) throw new CorpoInvalidoError()
        return deps.obraEstendida.gravar(lerJogador(headers), pedido.data)
      },
      { parse: 'none' },
    )
}
