import { envelope, ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import {
  AcessoBloqueadoError,
  ConflitoDoCadastroError,
  DesafioBloqueadoError,
  DesafioComProblemasError,
  DesafioDesatualizadoError,
  DesafioMudouError,
  DesafioNaoEncontradoError,
  DesafiosDesligadosError,
  ManifestoDesatualizadoError,
  ManifestoExcedeLimiteError,
  PlataformaIndisponivelError,
  SalvamentoGrandeDemaisError,
  SalvamentoIlegivelError,
  SemPermissaoDeEscritaError,
  SessaoTempoNaoPermitidaError,
  SomenteLeituraError,
} from '../../application/erros'
import type { ServicoDaEquipe } from '../../application/servico-da-equipe'
import type { ServicoDasCartas } from '../../application/servico-das-cartas'
import type { ServicoDoJogo } from '../../application/servico-do-jogo'
import type { ServicoDosDesafios } from '../../application/servico-dos-desafios'
import { ConferenciaIndisponivelError } from '../../domain/membros.port'
import {
  EventoTempoConflitanteError,
  SequenciaDeTempoInvalidaError,
} from '../../domain/tempo-erros'
import { rotasDaEquipe } from './rotas-da-equipe'
import { rotasDoCliente } from './rotas-do-cliente'
import { CorpoInvalidoError, rotasDoJogo } from './rotas-do-jogo'
import { rotasDosDesafios } from './rotas-dos-desafios'

export interface DependenciasHttp {
  logger: Logger
  servico: ServicoDoJogo
  cartas: ServicoDasCartas
  equipe: ServicoDaEquipe
  desafios: ServicoDosDesafios
  cliente: { dir: string; servirMapas: boolean }
  tokenInterno?: string
  maxRequestBodyBytes?: number
  readiness: () => Promise<void>
  /** Situação da conferência do mapa ilha → posto (informativa: não derruba o `/readyz`). */
  mapaDasIlhas?: () => string
}

/**
 * Corpo da seção Jogo do Admin: dois projetos do Estúdio (inicial e gabarito, até 1,5 MB cada) e o
 * resto do desafio. As rotas do jogo continuam com o teto pequeno (`maxRequestBodyBytes`).
 */
export const CORPO_DA_EQUIPE = 4 * 1024 * 1024

/** Conferir um desafio leva o projeto do Estúdio da pessoa (até 1,5 milhão de caracteres). */
export const CORPO_DA_CONFERENCIA = 4 * 1024 * 1024
const CONFERIR = /^\/arquipelago\/desafios\/[^/]+\/verificar$/

/** O teto do corpo pelo caminho: Admin e conferência levam projetos; o resto é pequeno. */
function tetoDoCaminho(caminho: string, tetoDoJogo: number): number {
  if (caminho.startsWith('/arquipelago/admin/')) return CORPO_DA_EQUIPE
  if (CONFERIR.test(caminho)) return CORPO_DA_CONFERENCIA
  return tetoDoJogo
}

/**
 * Borda HTTP do serviço do jogo. Tudo em `/arquipelago/*` chega pelo gateway (JWT lá; aqui a
 * prova de origem é o `x-internal-token`). Falha aqui só afeta a página do jogo.
 */
export function createServer(deps: DependenciasHttp) {
  const tetoDoJogo = deps.maxRequestBodyBytes ?? 96 * 1024
  const tetoDoServidor = Math.max(tetoDoJogo, CORPO_DA_EQUIPE, CORPO_DA_CONFERENCIA)
  return new Elysia({ serve: { maxRequestBodySize: tetoDoServidor } })
    .onRequest(({ request, set }) => {
      // O servidor aceita até o maior teto; cada caminho tem o seu (o jogo, o pequeno).
      const tamanho = Number(request.headers.get('content-length') ?? 0)
      if (tamanho > tetoDoCaminho(new URL(request.url).pathname, tetoDoJogo)) {
        set.status = 413
        return envelope('CORPO_GRANDE_DEMAIS', 'Requisição grande demais')
      }
    })
    .onError(({ error, set, code }) => {
      if (error instanceof SequenciaDeTempoInvalidaError) {
        set.status = 409
        return envelope('TEMPO_SEQUENCIA_INVALIDA', 'A sessão de tempo precisa ser retomada.')
      }
      if (error instanceof SessaoTempoNaoPermitidaError) {
        set.status = 403
        return envelope('TEMPO_NAO_PERMITIDO', error.message)
      }
      if (error instanceof EventoTempoConflitanteError) {
        set.status = 409
        return envelope('TEMPO_CONFLITANTE', 'Este registro de tempo não corresponde ao anterior.')
      }
      if (error instanceof AcessoBloqueadoError) {
        set.status = 403
        return { ...envelope('ACESSO_BLOQUEADO', error.message), motivo: error.motivo }
      }
      if (error instanceof PlataformaIndisponivelError) {
        // 424, não 5xx: o disjuntor do gateway contaria a queda do Members contra o jogo inteiro.
        set.status = 424
        return envelope('PLATAFORMA_INDISPONIVEL', error.message)
      }
      if (error instanceof DesafiosDesligadosError) {
        set.status = 403
        return envelope('DESAFIOS_DESLIGADOS', error.message)
      }
      if (error instanceof DesafioMudouError) {
        set.status = 409
        return envelope('DESAFIO_MUDOU', error.message)
      }
      if (error instanceof DesafioBloqueadoError) {
        set.status = 403
        return { ...envelope('DESAFIO_BLOQUEADO', error.message), situacao: error.situacao }
      }
      if (error instanceof ConferenciaIndisponivelError) {
        // Nada foi guardado: a pessoa tenta de novo. Nunca 5xx (disjuntor do gateway).
        const resposta = {
          indisponivel: [424, 'CONFERENCIA_INDISPONIVEL'],
          ocupado: [429, 'CONFERENCIA_OCUPADA'],
          sincronizando: [409, 'CONFERENCIA_SINCRONIZANDO'],
          recusado: [400, 'PROJETO_RECUSADO'],
        } as const
        const [status, codigo] = resposta[error.motivo]
        set.status = status
        return envelope(codigo, error.message)
      }
      if (error instanceof DesafioNaoEncontradoError) {
        set.status = 404
        return envelope('DESAFIO_NAO_ENCONTRADO', error.message)
      }
      if (error instanceof DesafioDesatualizadoError) {
        set.status = 409
        return { ...envelope('DESAFIO_DESATUALIZADO', error.message), atual: error.atual }
      }
      if (error instanceof ManifestoDesatualizadoError) {
        set.status = 409
        return envelope('MANIFESTO_DESATUALIZADO', error.message)
      }
      if (error instanceof ManifestoExcedeLimiteError) {
        set.status = 422
        return envelope('MANIFESTO_EXCEDE_LIMITE', error.message)
      }
      if (error instanceof ConflitoDoCadastroError) {
        set.status = 409
        return envelope(
          error.motivo === 'slug-em-uso' ? 'SLUG_EM_USO' : 'QUADRO_OCUPADO',
          error.message,
        )
      }
      if (error instanceof DesafioComProblemasError) {
        set.status = 422
        return { ...envelope('DESAFIO_COM_PROBLEMAS', error.message), problemas: error.problemas }
      }
      if (error instanceof SemPermissaoDeEscritaError) {
        set.status = 403
        return envelope('SEM_PERMISSAO', error.message)
      }
      if (error instanceof SomenteLeituraError) {
        set.status = 403
        return envelope('SOMENTE_LEITURA', error.message)
      }
      if (error instanceof SalvamentoGrandeDemaisError) {
        set.status = 413
        return envelope('SALVAMENTO_GRANDE_DEMAIS', error.message)
      }
      if (error instanceof SalvamentoIlegivelError) {
        // 409, não 5xx: o disjuntor do gateway contaria contra o serviço inteiro.
        deps.logger.error('arquipelago.salvamento_ilegivel', {})
        set.status = 409
        return envelope('SALVAMENTO_ILEGIVEL', error.message)
      }
      if (error instanceof UnauthorizedError) {
        set.status = 401
        return envelope('UNAUTHORIZED', error.message)
      }
      if (error instanceof ForbiddenError) {
        set.status = 403
        return envelope('FORBIDDEN', error.message)
      }
      if (error instanceof CorpoInvalidoError || code === 'VALIDATION' || code === 'PARSE') {
        // Envelope fixo: nunca ecoar o que chegou.
        set.status = 400
        return envelope('VALIDATION_ERROR', 'Requisição inválida')
      }
      if (code === 'NOT_FOUND') {
        set.status = 404
        return envelope('NOT_FOUND', 'Rota não encontrada')
      }
      set.status = 500
      deps.logger.error('unhandled.error', { error: serializeError(error) })
      return envelope('INTERNAL_ERROR', 'Erro interno')
    })
    .use(rotasDoCliente({ ...deps.cliente, tokenInterno: deps.tokenInterno }))
    .use(
      rotasDoJogo({ servico: deps.servico, cartas: deps.cartas, tokenInterno: deps.tokenInterno }),
    )
    .use(rotasDaEquipe({ equipe: deps.equipe, tokenInterno: deps.tokenInterno }))
    .use(rotasDosDesafios({ desafios: deps.desafios, tokenInterno: deps.tokenInterno }))
    .get('/healthz', () => ({ status: 'ok' }))
    .get('/readyz', async ({ set }) => {
      try {
        await deps.readiness()
        return { status: 'ready', mapaDasIlhas: deps.mapaDasIlhas?.() ?? 'desligada' }
      } catch {
        set.status = 503
        return { status: 'unavailable' }
      }
    })
}
