import * as Sentry from '@sentry/bun'
import { type ErrorEnvelope, envelope } from '@sistemazero/core/http'
import { type Logger, serializeError } from '@sistemazero/core/logging'

/**
 * Traduz erros INESPERADOS (lançados fora do pipeline) e códigos internos do
 * Elysia para o envelope padrão. Erros previstos do gateway já voltam como
 * Response pronta do pipeline (não passam por aqui).
 */
export function buildGatewayErrorResponse(input: {
  code: string | number
  error: unknown
  logger: Logger
}): { status: number; body: ErrorEnvelope } {
  const { code, error } = input

  if (code === 'NOT_FOUND')
    return { status: 404, body: envelope('NOT_FOUND', 'Recurso não encontrado') }
  if (code === 'VALIDATION') {
    return {
      status: 400,
      body: envelope(
        'VALIDATION_ERROR',
        error instanceof Error ? error.message : 'Requisição inválida',
      ),
    }
  }
  if (code === 'PARSE')
    return { status: 400, body: envelope('PARSE_ERROR', 'Corpo da requisição inválido') }

  input.logger.error('gateway.unhandled', { error: serializeError(error) })
  // Exceção inesperada (500) → Sentry com stack (o espelho de logs PULA
  // 'gateway.unhandled' de propósito — este capture é o evento canônico). No-op sem DSN.
  Sentry.captureException(error)
  return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno do gateway') }
}
