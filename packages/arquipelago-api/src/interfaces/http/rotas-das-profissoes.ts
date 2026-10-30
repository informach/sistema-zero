import { ConcluirProfissaoSchema, IniciarProfissaoSchema } from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDasProfissoes } from '../../application/servico-das-profissoes'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

export function rotasDasProfissoes(deps: {
  profissoes: ServicoDasProfissoes
  tokenInterno?: string
}) {
  return new Elysia({ prefix: '/arquipelago/profissoes' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .post('/iniciar', ({ headers, body }) => {
      const p = IniciarProfissaoSchema.safeParse(body)
      if (!p.success) throw new CorpoInvalidoError()
      return deps.profissoes.iniciar(lerJogador(headers), p.data.posto)
    })
    .post('/concluir', ({ headers, body }) => {
      const p = ConcluirProfissaoSchema.safeParse(body)
      if (!p.success) throw new CorpoInvalidoError()
      return deps.profissoes.concluir(lerJogador(headers), p.data)
    })
}
