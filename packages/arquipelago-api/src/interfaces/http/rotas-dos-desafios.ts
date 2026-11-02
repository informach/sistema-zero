import {
  type DesafioAberto,
  type DesafioNaLista,
  ILHA_IDS,
  PedirAmbienteDoDesafioSchema,
  VerificarDesafioSchema,
} from '@sistemazero/arquipelago-contracts'
import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ServicoDosDesafios } from '../../application/servico-dos-desafios'
import { exigirGateway, lerJogador } from './identidade'
import { CorpoInvalidoError } from './rotas-do-jogo'

const FiltroDaApresentacao = z.object({ apresentacao: z.literal('1').optional() })
const FiltroDaIlha = FiltroDaApresentacao.extend({ ilha: z.enum(ILHA_IDS).optional() })

// Telas já abertas usam contratos estritos. Só quem pede a apresentação recebe os campos
// novos; o domínio e a publicação continuam únicos, sem duplicar regras nem afrouxar schemas.
const semApresentacao = ({ resumo: _resumo, imagem: _imagem, ...d }: DesafioNaLista) => d
const semImagem = ({ imagem: _imagem, ...d }: DesafioAberto) => d

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
    .get('', async ({ headers, query }) => {
      const filtro = validar(FiltroDaIlha, query)
      const resposta = await desafios.listar(lerJogador(headers), filtro.ilha)
      return filtro.apresentacao === '1'
        ? resposta
        : { ...resposta, desafios: resposta.desafios.map(semApresentacao) }
    })
    .get('/cores', ({ headers }) => desafios.cores(lerJogador(headers)))
    .get('/:id', async ({ headers, params, query }) => {
      const filtro = validar(FiltroDaApresentacao, query)
      const resposta = await desafios.abrir(lerJogador(headers), idDe(params))
      return filtro.apresentacao === '1' ? resposta : semImagem(resposta)
    })
    .post('/:id/verificar', ({ headers, params, body }) =>
      desafios.verificar(lerJogador(headers), idDe(params), validar(VerificarDesafioSchema, body)),
    )
    .post('/:id/ambiente', ({ headers, params, body }) =>
      desafios.ambiente(
        lerJogador(headers),
        idDe(params),
        validar(PedirAmbienteDoDesafioSchema, body),
      ),
    )
    .post('/:id/recompensa-vista', ({ headers, params }) =>
      desafios.recompensaVista(lerJogador(headers), idDe(params)),
    )
}
