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
import { type Logger, serializeError } from '@sistemazero/core/logging'

export type { ErrorEnvelope }

/** Mapeia o `code` de domínio para o status HTTP apropriado. */
const DOMAIN_STATUS: Record<string, number> = {
  OBJECT_INACCESSIBLE: 404,
  ENGAGEMENT_UNAVAILABLE: 409,
  DIRECTORY_UNAVAILABLE: 503,
  OPERATION_REUSED: 409,
  IMPORT_CONFLICT: 409,
  DEPENDENCY_MISSING: 409,
  ASSET_UNCONFIRMED: 409,
  LEASE_EXPIRED: 409,
  DEVICE_REVOKED: 403,
  CONTEXT_CHANGED: 409,
  CONTEXT_TOO_LARGE: 400,
  DESKTOP_REQUIRED: 409,
  RETRY_REQUIRES_USER: 409,
  ATTEMPTS_EXHAUSTED: 409,
  VALIDATION_ERROR: 400,
  ASSET_TOO_LARGE: 400,
  ASSET_TYPE_NOT_ALLOWED: 400,
  OAUTH_STATE_INVALID: 400,
  DRIVE_FILE_INVALID: 400,
  IDEA_NOT_FOUND: 404,
  CONTENT_NOT_FOUND: 404,
  CHECKLIST_ITEM_NOT_FOUND: 404,
  PUBLICATION_NOT_FOUND: 404,
  ASSET_NOT_FOUND: 404,
  ACCOUNT_NOT_FOUND: 404,
  NETWORK_NOT_SUPPORTED: 404,
  EXTERNAL_POST_NOT_FOUND: 404,
  IDEA_NOT_PROMOTABLE: 409,
  INVALID_IDEA_STATUS_CHANGE: 409,
  INVALID_STAGE_TRANSITION: 409,
  INVALID_STATE_TRANSITION: 409,
  CHECKLIST_INCOMPLETE: 409,
  CONTENT_NOT_APPROVED: 409,
  INVALID_PUBLICATION_STATE: 409,
  AUTO_PUBLISH_UNAVAILABLE: 409,
  ASSET_NOT_READY: 409,
  CONCURRENCY_CONFLICT: 409,
  ACCOUNT_NOT_CONNECTED: 409,
  MEDIA_NOT_CONFIGURED: 503,
  OAUTH_NOT_CONFIGURED: 503,
  AI_NOT_CONFIGURED: 503,
  AI_UNAVAILABLE: 502,
}

/** Traduz qualquer erro num par status + corpo padronizado. */
export function buildErrorResponse(input: {
  code: string | number
  error: unknown
  logger: Logger
  privateContext?: boolean
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

  if (input.privateContext) {
    // SQL errors can contain bound DM payloads; neither logs nor exception tracking receive them.
    input.logger.error('engagement.http.failed', { code: 'INTERNAL_ERROR' })
    return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno') }
  }
  // Erro inesperado: loga com stack + Sentry (o espelho de log pula 'unhandled.error').
  Sentry.captureException(error)
  input.logger.error('unhandled.error', { error: serializeError(error) })
  return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno') }
}
