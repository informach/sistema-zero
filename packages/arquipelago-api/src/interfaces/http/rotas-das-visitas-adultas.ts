import {
  GerarConviteAdultoSchema,
  PedidoDeVisitaAdultaSchema,
} from '@sistemazero/arquipelago-contracts'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { ServicoDasVisitasAdultas } from '../../application/servico-das-visitas-adultas'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

export function rotasDasVisitasAdultas(deps: {
  visitas: ServicoDasVisitasAdultas
  tokenInterno?: string
}) {
  const codigo = (body: unknown) => {
    const p = PedidoDeVisitaAdultaSchema.safeParse(body)
    if (!p.success) throw new CorpoInvalidoError()
    return p.data.codigo
  }
  return new Elysia({ prefix: '/arquipelago/visitas-adultas' })
    .onBeforeHandle(({ headers, set }) => {
      exigirGateway(headers['x-internal-token'], deps.tokenInterno)
      set.headers['cache-control'] = 'private, no-store'
    })
    .get('/convite', ({ headers }) => deps.visitas.estado(lerJogador(headers)))
    .post(
      '/convite',
      async ({ headers, request }) => {
        const body = await readJsonBodyWithLimit(request, 1024, request.signal)
        if (!GerarConviteAdultoSchema.safeParse(body).success) throw new CorpoInvalidoError()
        return deps.visitas.gerar(lerJogador(headers))
      },
      { parse: 'none' },
    )
    .delete('/convite', ({ headers }) => deps.visitas.desligar(lerJogador(headers)), {
      parse: 'none',
    })
    .post(
      '/abrir',
      async ({ headers, request }) =>
        deps.visitas.abrir(
          lerJogador(headers),
          codigo(await readJsonBodyWithLimit(request, 1024, request.signal)),
        ),
      { parse: 'none' },
    )
    .post(
      '/conferir',
      async ({ headers, request }) =>
        deps.visitas.confirmar(
          lerJogador(headers),
          codigo(await readJsonBodyWithLimit(request, 1024, request.signal)),
        ),
      { parse: 'none' },
    )
}
