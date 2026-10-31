import {
  CORPO_DO_FANTASMA_MAX_BYTES,
  GuardarFantasmaSchema,
  PERCURSOS,
} from '@sistemazero/arquipelago-contracts'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ServicoDosFantasmas } from '../../application/servico-dos-fantasmas'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

const PercursoSchema = z.enum(PERCURSOS)
function percurso(v: string) {
  const p = PercursoSchema.safeParse(v)
  if (!p.success) throw new CorpoInvalidoError()
  return p.data
}

export function rotasDosFantasmas(deps: { fantasmas: ServicoDosFantasmas; tokenInterno?: string }) {
  return new Elysia({ prefix: '/arquipelago' })
    .onBeforeHandle(({ headers, set }) => {
      exigirGateway(headers['x-internal-token'], deps.tokenInterno)
      set.headers['cache-control'] = 'private, no-store'
    })
    .put(
      '/fantasmas',
      async ({ headers, request }) => {
        const body = await readJsonBodyWithLimit(
          request,
          CORPO_DO_FANTASMA_MAX_BYTES,
          request.signal,
        )
        const pedido = GuardarFantasmaSchema.safeParse(body)
        if (!pedido.success) throw new CorpoInvalidoError()
        return deps.fantasmas.guardar(lerJogador(headers), pedido.data)
      },
      {
        parse: 'none',
      },
    )
    .get('/fantasmas/:percurso', ({ headers, params }) =>
      deps.fantasmas.ler(lerJogador(headers), percurso(params.percurso)),
    )
    .get('/irmaos/:perfilId/fantasmas/:percurso', ({ headers, params }) => {
      const id = IdentityUuidSchema.safeParse(params.perfilId)
      if (!id.success) throw new CorpoInvalidoError()
      return deps.fantasmas.ler(lerJogador(headers), percurso(params.percurso), id.data)
    })
}
