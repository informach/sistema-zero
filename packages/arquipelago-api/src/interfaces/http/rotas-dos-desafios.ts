import { ILHA_IDS, VerificarDesafioSchema } from '@sistemazero/arquipelago-contracts'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ServicoDosDesafios } from '../../application/servico-dos-desafios'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

const FiltroDaIlha = z.object({ ilha: z.enum(ILHA_IDS).optional() })

function validar<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  valor: unknown,
): T {
  const r = schema.safeParse(valor)
  if (!r.success) throw new CorpoInvalidoError()
  return r.data
}

const idDe = (params: { id?: string }) => validar(IdentityUuidSchema, params.id)

/**
 * Os desafios de quem joga (`ARQUIPELAGO_DESAFIOS`). Quem é a pessoa vem SEMPRE dos `x-auth-*` do
 * gateway. O corpo da conferência leva o projeto do Estúdio: teto `CORPO_DA_CONFERENCIA`.
 */
export function rotasDosDesafios(deps: { desafios: ServicoDosDesafios; tokenInterno?: string }) {
  const { desafios } = deps
  return new Elysia({ prefix: '/arquipelago/desafios' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('', ({ headers, query }) =>
      desafios.listar(lerJogador(headers), validar(FiltroDaIlha, query).ilha),
    )
    .get('/:id', ({ headers, params }) => desafios.abrir(lerJogador(headers), idDe(params)))
    .post('/:id/verificar', ({ headers, params, body }) =>
      desafios.verificar(lerJogador(headers), idDe(params), validar(VerificarDesafioSchema, body)),
    )
    .post('/:id/recompensa-vista', ({ headers, params }) =>
      desafios.recompensaVista(lerJogador(headers), idDe(params)),
    )
}
