import { DomainError } from '@sistemazero/core/errors'
import {
  type ErrorEnvelope,
  envelope,
  ForbiddenError,
  PayloadTooLargeError,
  UnauthorizedError,
} from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { ConcurrencyConflictError } from '../../domain/ports/concurrency.error'
import { captureException } from '../../infrastructure/observability/sentry'

export type { ErrorEnvelope }

/** Mapeia o `code` de domínio para o status HTTP apropriado. */
const DOMAIN_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  MISSING_TEMPLATE_VARIABLE: 400,
  INVALID_STATE_TRANSITION: 409,
  CONCURRENCY_CONFLICT: 409,
  TEMPLATE_NOT_FOUND: 404,
  TEMPLATE_ALREADY_EXISTS: 409,
  MESSAGE_NOT_FOUND: 404,
  SENDER_NOT_FOUND: 404,
  NO_SENDER_AVAILABLE: 422,
  WHATSAPP_INSTANCE_NOT_FOUND: 404,
  NO_WHATSAPP_INSTANCE_AVAILABLE: 422,
  RECIPIENT_SUPPRESSED: 409,
  SENDER_ALREADY_EXISTS: 409,
  PROVIDER_ERROR: 502,
}

/**
 * Traduz qualquer erro (domínio, borda, validação do Elysia, inesperado) em um
 * par status + corpo padronizado. Centraliza a política de erros num só lugar.
 */
export function buildErrorResponse(input: {
  code: string | number
  error: unknown
  logger: Logger
}): { status: number; body: ErrorEnvelope } {
  const { error, code } = input

  if (error instanceof UnauthorizedError)
    return { status: 401, body: envelope('UNAUTHORIZED', error.message) }
  if (error instanceof ForbiddenError)
    return { status: 403, body: envelope('FORBIDDEN', error.message) }
  if (error instanceof PayloadTooLargeError)
    return { status: 413, body: envelope('PAYLOAD_TOO_LARGE', error.message) }

  if (error instanceof ConcurrencyConflictError) {
    return { status: 409, body: envelope(error.code, error.message) }
  }

  if (error instanceof DomainError) {
    return { status: DOMAIN_STATUS[error.code] ?? 400, body: envelope(error.code, error.message) }
  }

  // Códigos internos do Elysia (validação de schema, parse, rota inexistente).
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
  if (code === 'NOT_FOUND')
    return { status: 404, body: envelope('NOT_FOUND', 'Recurso não encontrado') }

  // Exceção real com stack → Sentry (o espelho de logs PULA 'unhandled.error').
  captureException(error)
  input.logger.error('unhandled.error', {
    message: error instanceof Error ? error.message : String(error),
  })
  return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno') }
}
