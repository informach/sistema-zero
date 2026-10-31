import {
  PedidoDeAceiteSchema,
  PedidoDeConviteDeAmigoSchema,
  PerfisDaFamiliaSchema,
} from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDasVisitasDeAmigos } from '../../application/servico-das-visitas-de-amigos'
import { CasaDeAmigoIndisponivelError } from '../../domain/visitas-de-amigos.port'
import { exigirGateway, lerJogador, lerResponsavel } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validar<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  corpo: unknown,
): T {
  const r = schema.safeParse(corpo)
  if (!r.success) throw new CorpoInvalidoError()
  return r.data
}

/**
 * Visitas de outras crianças (N08a). O responsável cuida dos convites e das casas aceitas em
 * `/arquipelago/familia/amigos*` (o gateway reserva `familia/` à área dos pais); a criança lê as
 * casas que a família dela aceitou em `/arquipelago/amigos*`, só leitura.
 */
export function rotasDasVisitasDeAmigos(deps: {
  amigos: ServicoDasVisitasDeAmigos
  tokenInterno?: string
}) {
  const { amigos } = deps
  return new Elysia({ prefix: '/arquipelago' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('/familia/amigos', ({ headers, query }) =>
      amigos.daFamilia(lerResponsavel(headers), validar(PerfisDaFamiliaSchema, query.perfis)),
    )
    .post('/familia/amigos/convite', ({ headers, body }) =>
      amigos.gerarConvite(
        lerResponsavel(headers),
        validar(PedidoDeConviteDeAmigoSchema, body).perfilId.toLowerCase(),
      ),
    )
    .delete('/familia/amigos/convite/:perfilId', ({ headers, params }) => {
      if (!UUID.test(params.perfilId)) throw new CorpoInvalidoError()
      return amigos.apagarConvite(lerResponsavel(headers), params.perfilId.toLowerCase())
    })
    .post('/familia/amigos/aceitar', ({ headers, body }) => {
      const pedido = validar(PedidoDeAceiteSchema, body)
      return amigos.aceitar(lerResponsavel(headers), pedido.codigo, pedido.apelido)
    })
    .delete('/familia/amigos/:id', ({ headers, params }) => {
      if (!UUID.test(params.id)) throw new CorpoInvalidoError()
      return amigos.remover(lerResponsavel(headers), params.id.toLowerCase())
    })
    .get('/amigos', ({ headers }) => amigos.casas(lerJogador(headers)))
    .get('/amigos/:id/casa', ({ headers, params }) => {
      const jogador = lerJogador(headers)
      if (!UUID.test(params.id)) throw new CasaDeAmigoIndisponivelError()
      return amigos.casa(jogador, params.id.toLowerCase())
    })
}
