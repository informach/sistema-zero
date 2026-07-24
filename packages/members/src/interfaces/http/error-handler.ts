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
import { CourseCareerLockedError, QuizCooldownError } from '../../domain/course/course.errors'
import { PensaGateNotReadyError } from '../../domain/pensa/pensa.errors'

export type { ErrorEnvelope }

/** Mapeia o `code` de domínio para o status HTTP apropriado. */
const DOMAIN_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  ACCESS_DENIED: 403,
  COURSE_NOT_FOUND: 404,
  LESSON_NOT_FOUND: 404,
  LESSON_LOCKED: 423,
  COURSE_CAREER_LOCKED: 423,
  ATTACHMENT_NOT_FOUND: 404,
  CONTENT_NOT_FOUND: 404,
  ENTITLEMENT_NOT_FOUND: 404,
  OFFER_NOT_FOUND: 404,
  QUIZ_BLOCK_NOT_FOUND: 404,
  EBOOK_BLOCK_NOT_FOUND: 404,
  STUDIO_BLOCK_NOT_FOUND: 404,
  CERTIFICATE_BLOCK_NOT_FOUND: 404,
  CERTIFICATE_NOT_ELIGIBLE: 409,
  CERTIFICATE_GATE_NOT_ISSUED: 409,
  CERTIFICATE_REVOKED: 410,
  INVALID_STATE_TRANSITION: 409,
  ENTITLEMENT_CONFLICT: 409,
  DUPLICATE_SLUG: 409,
  CAREER_SLOT_CONFLICT: 409,
  CONCURRENCY_CONFLICT: 409,
  NO_PUBLISHED_LESSON: 409,
  QUIZ_GATE_NOT_PASSED: 409,
  STUDIO_GATE_NOT_SUBMITTED: 409,
  STUDIO_GATE_NOT_PASSED: 409,
  QUIZ_COOLDOWN: 429,
  // Avatar / carteira Zappy.
  AVATAR_INVALID: 400,
  AVATAR_PART_FREE: 400,
  AVATAR_PART_NOT_OWNED: 403,
  AVATAR_PART_NOT_FOUND: 404,
  INSUFFICIENT_COINS: 402,
  // Quarto virtual.
  ROOM_ITEM_FREE: 400,
  ROOM_ITEM_NOT_PURCHASABLE: 400,
  ROOM_ITEM_NOT_FOUND: 404,
  // Missões + proteção de sequência.
  MISSION_NOT_FOUND: 404,
  MISSION_NOT_COMPLETED: 409,
  MAX_FREEZES: 409,
  VACATION_INVALID: 400,
  // Desafio do mês (tema gerenciável pelo admin).
  CHALLENGE_MONTH_INVALID: 400,
  CHALLENGE_MONTH_PAST: 400,
  CHALLENGE_THEME_NOT_FOUND: 404,
  CHALLENGE_THEME_ARCHIVED: 409,
  // Pensa (planejamento guiado). NOT_FOUND cobre também ownership mismatch
  // (nunca vazar existência); os demais são conflitos de estado/cota.
  PENSA_NOT_FOUND: 404,
  PENSA_QUOTA_EXCEEDED: 409,
  PENSA_CYCLE_NOT_DONE: 409,
  PENSA_GATE_NOT_READY: 409,
  PENSA_STAGE_MISMATCH: 409,
}

/** Traduz qualquer erro num par status + corpo padronizado. */
export function buildErrorResponse(input: {
  code: string | number
  error: unknown
  logger: Logger
}): {
  status: number
  body: ErrorEnvelope & {
    retryAvailableAt?: string
    details?: { gate: string; missing: string[] }
    careerLock?: {
      reason: 'future-tier' | 'foundation-first' | 'tier-reward'
      requiredLevel?: string
    }
  }
} {
  const { error, code } = input

  if (error instanceof CourseCareerLockedError) {
    return {
      status: 423,
      body: {
        ...envelope(error.code, error.message),
        careerLock: {
          reason: error.reason,
          ...(error.requiredLevel ? { requiredLevel: error.requiredLevel } : {}),
        },
      },
    }
  }

  // Cooldown do quiz: além do code/message, expõe `retryAvailableAt` ESTRUTURADO
  // (o cliente inicia o countdown sem reler a aula — útil no 429 de corrida).
  if (error instanceof QuizCooldownError) {
    return {
      status: 429,
      body: {
        ...envelope(error.code, error.message),
        retryAvailableAt: error.retryAvailableAt.toISOString(),
      },
    }
  }

  // Gate do advance do Pensa: expõe `details.gate` + `details.missing`
  // ESTRUTURADOS (contrato) — a UI mostra exatamente o que falta na etapa.
  if (error instanceof PensaGateNotReadyError) {
    return {
      status: 409,
      body: {
        ...envelope(error.code, error.message),
        details: { gate: error.gate, missing: error.missing },
      },
    }
  }

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

  // Erro inesperado: loga com stack (serializeError, aninhado em `error:` — nunca
  // espalhado, colidiria com `message` do evento), espelhando o gateway/auth.
  // Exceção inesperada (500) → Sentry com stack (o espelho pula 'unhandled.error').
  Sentry.captureException(error)
  input.logger.error('unhandled.error', { error: serializeError(error) })
  return { status: 500, body: envelope('INTERNAL_ERROR', 'Erro interno') }
}
