import {
  ESTADOS_DA_REVISAO_HUMANA,
  ResponderRevisaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ServicoDasRevisoesHumanas } from '../../application/servico-das-revisoes-humanas'
import { exigirGateway, lerEquipe } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

function validar<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  valor: unknown,
): T {
  const r = schema.safeParse(valor)
  if (!r.success) throw new CorpoInvalidoError()
  return r.data
}
const uuid = (v: unknown) => validar(IdentityUuidSchema, v)
const FiltroDaFila = z.object({ estado: z.enum(ESTADOS_DA_REVISAO_HUMANA).optional() })

/**
 * A revisão humana da Lenda (lacunas, 01/11/2026): a equipe lê a fila e responde, pelo mesmo
 * prefixo da seção Jogo do Admin. O gateway e a política do Kids já recusam `/arquipelago/admin/*`
 * ao aluno e ao responsável; quem joga vê a revisão na lista de desafios.
 */
export function rotasDasRevisoesHumanas(deps: {
  revisoes: ServicoDasRevisoesHumanas
  tokenInterno?: string
}) {
  const { revisoes } = deps
  return new Elysia({ prefix: '/arquipelago/admin' })
    .onBeforeHandle(({ headers, set }) => {
      exigirGateway(headers['x-internal-token'], deps.tokenInterno)
      set.headers['cache-control'] = 'private, no-store'
    })
    .get('/revisoes', ({ headers, query }) =>
      revisoes.fila(lerEquipe(headers), validar(FiltroDaFila, query).estado),
    )
    .get('/revisoes/:jogador/:desafio', ({ headers, params }) =>
      revisoes.abrir(lerEquipe(headers), uuid(params.jogador), uuid(params.desafio)),
    )
    .post('/revisoes/:jogador/:desafio', ({ headers, params, body }) =>
      revisoes.responder(
        lerEquipe(headers),
        uuid(params.jogador),
        uuid(params.desafio),
        validar(ResponderRevisaoSchema, body),
      ),
    )
}
