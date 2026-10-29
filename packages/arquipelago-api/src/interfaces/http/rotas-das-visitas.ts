import { Elysia } from 'elysia'
import { IrmaoNaoEncontradoError } from '../../application/erros'
import type { ServicoDasVisitas } from '../../application/servico-das-visitas'
import { exigirGateway, lerJogador } from './identidade'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Recordes da família e visitas (fase3-12, 29/10/2026): `GET /arquipelago/irmaos` e
 * `GET /arquipelago/irmaos/:perfilId/casa`, só leitura, de quem joga. Fora de
 * `/arquipelago/familia/`, que o gateway reserva à área dos pais.
 */
export function rotasDasVisitas(deps: { visitas: ServicoDasVisitas; tokenInterno?: string }) {
  const { visitas } = deps
  return new Elysia({ prefix: '/arquipelago/irmaos' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('', ({ headers }) => visitas.irmaos(lerJogador(headers)))
    .get('/:perfilId/casa', ({ headers, params }) => {
      const jogador = lerJogador(headers)
      if (!UUID.test(params.perfilId)) throw new IrmaoNaoEncontradoError()
      return visitas.casa(jogador, params.perfilId.toLowerCase())
    })
}
