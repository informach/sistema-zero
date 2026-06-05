import { DomainError } from '@sistemazero/core/errors'
import {
  type ErrorEnvelope,
  envelope,
  ForbiddenError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnauthorizedError,
} from '@sistemazero/core/http'
import { type Logger, serializeError } from '@sistemazero/core/logging'

export type { ErrorEnvelope }

/** Mapeia o `code` de domínio para o status HTTP apropriado. */
const DOMAIN_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  INVALID_STATE_TRANSITION: 409,
  PRODUCT_NOT_FOUND: 404,
  OFFER_NOT_FOUND: 404,
  OFFER_NOT_AVAILABLE: 409,
  COUPON_NOT_FOUND: 404,
  DUPLICATE_PRODUCT: 409,
  DUPLICATE_OFFER: 409,
  DUPLICATE_COUPON: 409,
  CONCURRENCY_CONFLICT: 409,
  COUPON_NOT_APPLICABLE: 422,
  COUPON_EXHAUSTED: 422,
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
  if (error instanceof TooManyRequestsError)
    return { status: 429, body: envelope('TOO_MANY_REQUESTS', error.message) }
  if (error instanceof PayloadTooLargeError)
    return { status: 413, body: envelope('PAYLOAD_TOO_LARGE', error.message) }

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

  input.logger.error('unhandled.error', { error: serializeError(error) })
  return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno') }
}
