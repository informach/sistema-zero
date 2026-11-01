import { PedirAmbienteDoDesafioSchema } from '@sistemazero/arquipelago-contracts'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { Elysia } from 'elysia'
import type { ServicoDosMinijogos } from '../../application/servico-dos-minijogos'
import { exigirGateway, lerJogador, lerResponsavel } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

function id(v: string) {
  const r = IdentityUuidSchema.safeParse(v)
  if (!r.success) throw new CorpoInvalidoError()
  return r.data
}
export function rotasDosMinijogos(deps: { minijogos: ServicoDosMinijogos; tokenInterno?: string }) {
  const s = deps.minijogos
  return new Elysia({ prefix: '/arquipelago' })
    .onBeforeHandle(({ headers, set }) => {
      exigirGateway(headers['x-internal-token'], deps.tokenInterno)
      set.headers['cache-control'] = 'private, no-store'
    })
    .get('/minijogos', ({ headers }) => s.listar(lerJogador(headers)))
    .get('/minijogos/:id', ({ headers, params }) => s.abrir(lerJogador(headers), id(params.id)))
    .get('/familia/minijogos/:perfil', ({ headers, params }) =>
      s.listarDaFamilia(lerResponsavel(headers), id(params.perfil)),
    )
    .get('/familia/minijogos/:perfil/:id', ({ headers, params }) =>
      s.abrirDaFamilia(lerResponsavel(headers), id(params.perfil), id(params.id)),
    )
    .post('/familia/minijogos/:perfil/:id/ambiente', ({ headers, params, body }) => {
      const pedido = PedirAmbienteDoDesafioSchema.safeParse(body)
      if (!pedido.success) throw new CorpoInvalidoError()
      return s.ambienteDaFamilia(
        lerResponsavel(headers),
        id(params.perfil),
        id(params.id),
        pedido.data,
      )
    })
}
