import { ValidationError } from '@sistemazero/core/errors'
import { UnauthorizedError } from '@sistemazero/core/http'
import { JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import { ProjectStructureAnalysisLimitError } from '@sistemazero/core/learning'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { AdultJourneyService } from '../../../application/adult-journey/adult-journey.service'
import {
  type ArquipelagoCourseActivityService,
  AULAS_CONCLUIDAS_MAXIMO_DE_PESSOAS,
} from '../../../application/arquipelago/arquipelago-course-activity.service'
import type { ArquipelagoObjectivesService } from '../../../application/arquipelago/arquipelago-objectives.service'
import type { ArquipelagoReadsService } from '../../../application/arquipelago/arquipelago-reads.service'
import type { KidsJourneyQueryService } from '../../../application/kids-journey/kids-journey-query.service'
import {
  KidsJourneyInitializingError,
  KidsJourneyUnavailableError,
} from '../../../domain/kids-journey/kids-journey.errors'
import {
  ProjectCheckBusyError,
  ProjectCheckRejectedError,
  ProjectCheckUnavailableError,
  StudioProjectSyncingError,
} from '../../../domain/learning/learning.errors'

/**
 * Rotas S2S para o serviço do jogo (Arquipélago): nunca roteadas pelo gateway nem expostas ao
 * navegador. Token PRÓPRIO, separado do das moedas (`x-arquipelago-token` com o
 * `ARQUIPELAGO_MEMBERS_TOKEN`): quem lê e confere não move moeda. Os formatos de resposta são os
 * de `arquipelago-contracts/src/membros.ts`, validados do lado do jogo.
 */
const Publico = z.enum(['kids', 'adult'])
const PerguntaDoJogador = z.object({
  userId: z.uuid(),
  accountId: z.uuid(),
  audience: Publico,
})

/**
 * Corpo de `/objetivos/*`: só a forma e os tamanhos. O sentido da regra, Python, Pro e os tetos
 * do desafio são conferidos no serviço (na análise viram `problemas`, nunca 400).
 */
const Projeto = z.custom<Record<string, unknown>>(
  (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor),
)
const Objetivo = z.object({
  id: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  hint: z.string().trim().max(300).optional(),
  optional: z.literal(true).optional(),
  programmingLanguage: z.string().max(40).optional(),
  rule: z.record(z.string(), z.unknown()),
})
const PedidoDeAnalise = z.object({
  audience: Publico,
  projetoInicial: Projeto,
  gabarito: Projeto,
  objetivos: z.array(Objetivo).max(100),
})
/** `?usuarios=a,b&de=ISO&ate=ISO`: os tetos de pessoas e da janela são do serviço. */
const PerguntaDasAulas = z.object({
  usuarios: z
    .string()
    .transform((csv) => csv.split(',').map((id) => id.trim()))
    .pipe(z.array(z.uuid()).min(1).max(AULAS_CONCLUIDAS_MAXIMO_DE_PESSOAS)),
  de: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  ate: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
})
const PedidoDeVerificacao = z.object({
  requester: z.uuid(),
  audience: Publico,
  objetivos: z.array(Objetivo).min(1).max(20),
  projetoInicial: Projeto,
  projeto: Projeto,
})

/** O que a verificação devolve como erro (o jogo lê o `code`; nada vira 5xx por causa do executor). */
function erroDaVerificacao(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof ProjectCheckRejectedError)
    return { status: 400, code: 'PROJECT_CHECK_REJECTED', message: error.message }
  if (error instanceof ValidationError)
    return { status: 400, code: 'VALIDATION_ERROR', message: error.message }
  if (error instanceof StudioProjectSyncingError)
    return { status: 409, code: error.code, message: error.message }
  if (
    error instanceof ProjectCheckUnavailableError ||
    error instanceof ProjectStructureAnalysisLimitError
  )
    return { status: 424, code: error.code, message: error.message }
  if (error instanceof ProjectCheckBusyError)
    return { status: 429, code: error.code, message: error.message }
  throw error
}

export function arquipelagoInternalRoutes(deps: {
  kidsJourney: Pick<KidsJourneyQueryService, 'staffPreview'>
  adultJourney: Pick<AdultJourneyService, 'policy'>
  leituras: Pick<ArquipelagoReadsService, 'jogador' | 'curriculoDeBlocos'>
  objetivos: Pick<ArquipelagoObjectivesService, 'analisar' | 'verificar'>
  /** A hora das aulas concluídas (a "volta ao curso" da área dos pais); ausente, 424. */
  aulas?: Pick<ArquipelagoCourseActivityService, 'concluidas'>
  token?: string
}) {
  const jornadaIndisponivel = (error: unknown) =>
    error instanceof KidsJourneyInitializingError || error instanceof KidsJourneyUnavailableError
  return (
    new Elysia({ prefix: '/members/internal/arquipelago' })
      .onBeforeHandle(({ headers }) => {
        if (
          !deps.token ||
          !headers['x-arquipelago-token'] ||
          !safeEqual(headers['x-arquipelago-token'], deps.token)
        )
          throw new UnauthorizedError('Chamada não autorizada')
      })
      .get('/jornada', async () => {
        // Política do Kids não publicada (iniciando ou indisponível) responde versão 0, sem postos;
        // outra falha (banco fora) sobe como erro, para o jogo não ler "não publicada" por engano.
        const kids = await deps.kidsJourney.staffPreview().then(
          (preview) => ({ versao: preview.policyVersion, postos: [...JOURNEY_LEVEL_SLUGS] }),
          (error: unknown) => {
            if (jornadaIndisponivel(error)) return { versao: 0, postos: [] as string[] }
            throw error
          },
        )
        const adulto = await deps.adultJourney.policy()
        return {
          kids,
          adulto: {
            versao: adulto.version,
            configurada: adulto.version > 0 && adulto.policy.stages.length > 0,
            etapas: adulto.policy.stages.map((etapa) => ({ id: etapa.id, titulo: etapa.title })),
          },
        }
      })
      /** Posto (posição) e blocos conquistados de quem joga. 424 = jornada do Kids indisponível. */
      .get('/jogador', async ({ query, set }) => {
        const pergunta = PerguntaDoJogador.safeParse(query)
        if (!pergunta.success) {
          set.status = 400
          return { error: { code: 'INVALID_QUERY' } }
        }
        try {
          return await deps.leituras.jogador(pergunta.data)
        } catch (error) {
          if (!jornadaIndisponivel(error)) throw error
          set.status = 424
          return { error: { code: 'JORNADA_INDISPONIVEL' } }
        }
      })
      /**
       * A hora das aulas concluídas destas pessoas entre `de` e `ate` (até 20 pessoas e 9 dias),
       * no formato `AulasConcluidasDosMembrosSchema`. Pedido fora dos limites: 400.
       */
      .get('/aulas-concluidas', async ({ query, set }) => {
        const pergunta = PerguntaDasAulas.safeParse(query)
        if (!pergunta.success) {
          set.status = 400
          return { error: { code: 'INVALID_QUERY' } }
        }
        if (!deps.aulas) {
          set.status = 424
          return { error: { code: 'AULAS_INDISPONIVEIS' } }
        }
        try {
          return await deps.aulas.concluidas(pergunta.data)
        } catch (error) {
          if (!(error instanceof ValidationError)) throw error
          set.status = 400
          return { error: { code: 'INVALID_QUERY' } }
        }
      })
      /** Cursos publicados (gravados) com os blocos que liberam e o posto de cada um. */
      .get('/curriculo-de-blocos', async ({ query, set }) => {
        const publico = Publico.safeParse(query.audience)
        if (!publico.success) {
          set.status = 400
          return { error: { code: 'INVALID_QUERY' } }
        }
        try {
          return await deps.leituras.curriculoDeBlocos(publico.data)
        } catch (error) {
          if (!jornadaIndisponivel(error)) throw error
          set.status = 424
          return { error: { code: 'JORNADA_INDISPONIVEL' } }
        }
      })
      /**
       * Confere um desafio com o verificador das aulas (`AnaliseDosMembrosSchema`): blocos do
       * gabarito, vista dos objetivos, problemas e o gabarito/inicial em cada objetivo.
       */
      .post('/objetivos/analisar', async ({ body, set }) => {
        const pedido = PedidoDeAnalise.safeParse(body)
        if (!pedido.success) {
          set.status = 400
          return { error: { code: 'INVALID_BODY' } }
        }
        return deps.objetivos.analisar(pedido.data)
      })
      /**
       * Confere o projeto de quem joga (`VerificacaoDosMembrosSchema`), sem guardar nada.
       * 400 projeto inválido, 409 sincronizando, 424 executor fora, 429 executor ocupado.
       */
      .post('/objetivos/verificar', async ({ body, set }) => {
        const pedido = PedidoDeVerificacao.safeParse(body)
        if (!pedido.success) {
          set.status = 400
          return { error: { code: 'INVALID_BODY' } }
        }
        try {
          return await deps.objetivos.verificar(pedido.data)
        } catch (error) {
          const { status, code, message } = erroDaVerificacao(error)
          set.status = status
          return { error: { code, message } }
        }
      })
  )
}
