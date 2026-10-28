import {
  CODIGO_SALVAMENTO_DESATUALIZADO,
  ComandoSessaoTempoSchema,
  type ConflitoDeSalvamento,
  GravarSalvamentoSchema,
  LimiteDaFamiliaSchema,
  RegistrarTempoSchema,
} from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import type { ServicoDasCartas } from '../../application/servico-das-cartas'
import type { ServicoDoJogo } from '../../application/servico-do-jogo'
import { exigirGateway, lerJogador, lerResponsavel } from './identidade'

export class CorpoInvalidoError extends Error {
  constructor() {
    super('Requisição inválida')
  }
}

function validar<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  corpo: unknown,
): T {
  const r = schema.safeParse(corpo)
  if (!r.success) throw new CorpoInvalidoError()
  return r.data
}

/**
 * Rotas do jogo, chamadas pelo navegador através do repasse da plataforma e do gateway. Quem é
 * a pessoa vem SEMPRE dos `x-auth-*` do gateway, nunca do corpo.
 */
export function rotasDoJogo(deps: {
  servico: ServicoDoJogo
  cartas: ServicoDasCartas
  tokenInterno?: string
}) {
  const { servico } = deps
  return new Elysia({ prefix: '/arquipelago' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('/acesso', ({ headers }) => servico.acesso(lerJogador(headers)))
    .get('/salvamento', ({ headers }) => servico.lerSalvamento(lerJogador(headers)))
    .get('/cartas', ({ headers }) => deps.cartas.cartas(lerJogador(headers)))
    .put('/salvamento', async ({ headers, body, set }) => {
      const r = await servico.gravarSalvamento(
        lerJogador(headers),
        validar(GravarSalvamentoSchema, body),
      )
      if (r.ok) return r.guardado
      set.status = 409
      const conflito: ConflitoDeSalvamento = {
        error: { code: CODIGO_SALVAMENTO_DESATUALIZADO, message: 'Salvo em outro aparelho' },
        atual: r.atual,
      }
      return conflito
    })
    .post('/tempo', ({ set }) => {
      set.status = 410
      return { code: 'ATUALIZACAO_NECESSARIA', message: 'Atualize o jogo para continuar.' }
    })
    .post('/tempo/recuperar', ({ headers, body }) => {
      const pedido = validar(RegistrarTempoSchema, body)
      return servico.registrarTempo(
        lerJogador(headers),
        pedido.segundos,
        pedido.eventoId,
        pedido.dia,
      )
    })
    .post('/tempo/sessao', ({ headers, body }) =>
      servico.comandarSessaoTempo(lerJogador(headers), validar(ComandoSessaoTempoSchema, body)),
    )
    .get('/familia/limite', async ({ headers }) => ({
      limiteDiarioMinutos: await servico.lerLimiteDaFamilia(lerResponsavel(headers)),
    }))
    .put('/familia/limite', async ({ headers, body }) => ({
      limiteDiarioMinutos: await servico.gravarLimiteDaFamilia(
        lerResponsavel(headers),
        validar(LimiteDaFamiliaSchema, body).limiteDiarioMinutos,
      ),
    }))
}
