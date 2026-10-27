import { envelope, ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import {
  AcessoBloqueadoError,
  SalvamentoGrandeDemaisError,
  SalvamentoIlegivelError,
  SessaoTempoNaoPermitidaError,
  SomenteLeituraError,
} from '../../application/erros'
import type { ServicoDoJogo } from '../../application/servico-do-jogo'
import {
  DataTempoInvalidaError,
  EventoTempoConflitanteError,
  SequenciaDeTempoInvalidaError,
} from '../../domain/tempo-erros'
import { rotasDoCliente } from './rotas-do-cliente'
import { CorpoInvalidoError, rotasDoJogo } from './rotas-do-jogo'

export interface DependenciasHttp {
  logger: Logger
  servico: ServicoDoJogo
  cliente: { dir: string; servirMapas: boolean }
  tokenInterno?: string
  maxRequestBodyBytes?: number
  readiness: () => Promise<void>
}

/**
 * Borda HTTP do serviço do jogo. Tudo em `/arquipelago/*` chega pelo gateway (JWT lá; aqui a
 * prova de origem é o `x-internal-token`). Falha aqui só afeta a página do jogo.
 */
export function createServer(deps: DependenciasHttp) {
  return new Elysia({ serve: { maxRequestBodySize: deps.maxRequestBodyBytes ?? 96 * 1024 } })
    .onError(({ error, set, code }) => {
      if (error instanceof SequenciaDeTempoInvalidaError) {
        set.status = 409
        return envelope('TEMPO_SEQUENCIA_INVALIDA', 'A sessão de tempo precisa ser retomada.')
      }
      if (error instanceof SessaoTempoNaoPermitidaError) {
        set.status = 403
        return envelope('TEMPO_NAO_PERMITIDO', error.message)
      }
      if (error instanceof DataTempoInvalidaError) {
        set.status = 400
        return envelope('VALIDATION_ERROR', 'Data do registro de tempo inválida.')
      }
      if (error instanceof EventoTempoConflitanteError) {
        set.status = 409
        return envelope('TEMPO_CONFLITANTE', 'Este registro de tempo não corresponde ao anterior.')
      }
      if (error instanceof AcessoBloqueadoError) {
        set.status = 403
        return { ...envelope('ACESSO_BLOQUEADO', error.message), motivo: error.motivo }
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
    .use(rotasDoJogo({ servico: deps.servico, tokenInterno: deps.tokenInterno }))
    .get('/healthz', () => ({ status: 'ok' }))
    .get('/readyz', async ({ set }) => {
      try {
        await deps.readiness()
        return { status: 'ready' }
      } catch {
        set.status = 503
        return { status: 'unavailable' }
      }
    })
}
