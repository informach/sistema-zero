import { DomainError } from '@sistemazero/core/errors'
import {
  type ErrorEnvelope,
  envelope,
  ForbiddenError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnauthorizedError,
} from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'

export type { ErrorEnvelope }

/** Mapeia o `code` de domínio para o status HTTP apropriado. */
const DOMAIN_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  EMAIL_ALREADY_IN_USE: 409,
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 404,
  USER_NOT_ACTIVE: 403,
  INVALID_REFRESH_TOKEN: 401,
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

  input.logger.error('unhandled.error', {
    message: error instanceof Error ? error.message : String(error),
  })
  return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno') }
}
