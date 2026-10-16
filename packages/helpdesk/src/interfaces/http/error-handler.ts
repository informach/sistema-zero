import * as Sentry from '@sentry/bun'
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
import { LlmError } from '../../domain/ports/llm-client.port'

export type { ErrorEnvelope }

/** Mapeia o `code` de domínio para o status HTTP apropriado. */
const DOMAIN_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  OAUTH_STATE_INVALID: 400,
  CUSTOMER_TICKET_CURSOR_INVALID: 400,
  TICKET_CURSOR_INVALID: 400,
  TRIAGE_RULES_INVALID: 400,
  TICKET_NOT_FOUND: 404,
  SOURCE_UNAVAILABLE: 404,
  KB_ARTICLE_NOT_FOUND: 404,
  KNOWLEDGE_NOT_READY: 409,
  KNOWLEDGE_INVALID: 400,
  CONCURRENCY_CONFLICT: 409,
  CONNECTION_NOT_CONNECTED: 409,
  INVALID_TICKET_STATE: 409,
  TICKET_NOT_HUMAN: 409,
  GMAIL_SEND_FAILED: 502,
  GMAIL_NOT_CONFIGURED: 503,
  AI_NOT_CONFIGURED: 503,
}

/** Traduz qualquer erro num par status + corpo padronizado. */
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

  // IA: sem chave = 503; upstream/JSON inválido = 502 (o ticket segue usável).
  if (error instanceof LlmError) {
    if (error.kind === 'not_configured') {
      return { status: 503, body: envelope('AI_NOT_CONFIGURED', 'IA não configurada') }
    }
    return {
      status: 502,
      body: envelope('AI_UNAVAILABLE', 'A IA está indisponível no momento. Tente de novo'),
    }
  }

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

  // Erros de driver podem conter SQL e parâmetros pessoais; envie somente a classe da falha.
  const safeError = new Error('Falha inesperada no Helpdesk')
  safeError.name = error instanceof Error ? error.name : 'UnknownError'
  Sentry.captureException(safeError)
  input.logger.error('unhandled.error', { kind: safeError.name })
  return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno') }
}
