import * as Sentry from '@sentry/bun'
import { DomainError } from '@sistemazero/core/errors'
import type { HelpValidationIssue } from '@sistemazero/core/help'
import {
  type ErrorEnvelope,
  envelope,
  ForbiddenError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnauthorizedError,
} from '@sistemazero/core/http'
import { type Logger, serializeError } from '@sistemazero/core/logging'
import { CourseJourneyLockedError, QuizCooldownError } from '../../domain/course/course.errors'
import {
  CreationClientOutdatedError,
  CreationPartMissingError,
  CreationPartsNeedBytesError,
  CreationStaleBaseError,
} from '../../domain/creations/creation.errors'
import { HelpTutorialConflictError, HelpTutorialInvalidError } from '../../domain/help/help.errors'

export type { ErrorEnvelope }

/** Mapeia o `code` de domínio para o status HTTP apropriado. */
const DOMAIN_STATUS: Record<string, number> = {
  KIDS_JOURNEY_CONFLICT: 409,
  KIDS_JOURNEY_PREPARATION_MISSING: 404,
  KIDS_JOURNEY_CATALOG_BUSY: 409,
  KIDS_JOURNEY_INITIALIZING: 503,
  KIDS_JOURNEY_UNAVAILABLE: 503,
  ZAPPY_CONTEXT_CONFLICT: 409,
  STUDIO_AI_UNAVAILABLE: 503,
  STUDIO_PYTHON_PROJECT_CHECK_UNAVAILABLE: 503,
  GALLERY_SOURCE_UNAVAILABLE: 503,
  STUDIO_AI_CONFLICT: 409,
  STUDIO_BUILDER_CONFLICT: 409,
  LIVE_NOT_FOUND: 404,
  LIVE_ACCESS_DENIED: 403,
  LIVE_CONFLICT: 409,
  LIVE_UNAVAILABLE: 503,
  VALIDATION_ERROR: 400,
  PURCHASE_ACCESS_POLICY_INVALID: 422,
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
  LEARNING_CONFLICT: 409,
  STUDIO_PROJECT_SYNCING: 409,
  // 424 e não 503: o defeito é do executor (dependência), não do members. Um 5xx aqui entraria
  // na conta do disjuntor do gateway e uma queda do executor fecharia TODAS as rotas do members.
  PROJECT_CHECK_UNAVAILABLE: 424,
  PROJECT_CHECK_ANALYSIS_LIMIT: 424,
  PROJECT_CHECK_BUSY: 429,
  SECTION_LOCKED: 423,
  SECTION_GATE_INCOMPLETE: 409,
  LESSON_DRAFT_CONFLICT: 409,
  LEARNING_GATE_INCOMPLETE: 409,
  EBOOK_BLOCK_NOT_FOUND: 404,
  STUDIO_BLOCK_NOT_FOUND: 404,
  PINTA_BLOCK_NOT_FOUND: 404,
  CERTIFICATE_BLOCK_NOT_FOUND: 404,
  CERTIFICATE_NOT_ELIGIBLE: 409,
  CERTIFICATE_GATE_NOT_ISSUED: 409,
  CERTIFICATE_REVOKED: 410,
  INVALID_STATE_TRANSITION: 409,
  ENTITLEMENT_CONFLICT: 409,
  DUPLICATE_SLUG: 409,
  CLONE_SAME_AUDIENCE: 409,
  // Cursos ao vivo (14/10/2026).
  COURSE_MODALITY_LOCKED: 409,
  LIVE_LESSON_CLOSED: 403,
  CAREER_SLOT_CONFLICT: 409,
  CONCURRENCY_CONFLICT: 409,
  NO_PUBLISHED_LESSON: 409,
  NO_SHOWCASE_BLOCK: 409,
  PINTA_CHAIN_TYPE_MISMATCH: 409,
  QUIZ_GATE_NOT_PASSED: 409,
  STUDIO_GATE_NOT_SUBMITTED: 409,
  PINTA_GATE_NOT_SUBMITTED: 409,
  LESSON_COMING_SOON: 409,
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
  UNIT_NOT_COMPLETED: 409,
  MAX_FREEZES: 409,
  VACATION_INVALID: 400,
  // Desafio do mês (tema gerenciável pelo admin).
  CHALLENGE_MONTH_INVALID: 400,
  CHALLENGE_MONTH_PAST: 400,
  CHALLENGE_THEME_NOT_FOUND: 404,
  CHALLENGE_THEME_ARCHIVED: 409,
  // Pensa (planejamento guiado). NOT_FOUND cobre também ownership mismatch
  // (nunca vazar existência); os demais são conflitos de estado/cota.
  PROJECT_GONE: 404,
  REVISION_CONFLICT: 409,
  DRAFT_CHANGED: 409,
  MISSION_UNAVAILABLE: 409,
  DEPENDENCY_PENDING: 409,
  RESOURCES_CHANGED: 409,
  RESOURCES_UNAVAILABLE: 503,
  CREATION_NOT_SAVED: 409,
  CREATION_CHANGED: 409,
  EXTENSION_CONFLICT: 409,
  NOT_YOUR_MISSION: 403,
  QUOTA_EXCEEDED: 409,
  OPERATION_FAILED: 409,
  CREATION_NOT_FOUND: 404,
  CREATION_QUOTA_EXCEEDED: 409,
  CREATION_REVISION_MISMATCH: 409,
  CREATION_STALE_BASE: 409,
  CREATION_PARTS_NEED_BYTES: 409,
  CREATION_PART_MISSING: 409,
  // "Como fazer" (biblioteca de ajuda do Kids).
  HELP_TUTORIAL_NOT_FOUND: 404,
  HELP_COLLECTION_NOT_FOUND: 404,
  HELP_TUTORIAL_CONFLICT: 409,
  HELP_TUTORIAL_INVALID: 400,
  HELP_DUPLICATE_SLUG: 409,
  HELP_COLLECTION_IN_USE: 409,
  HELP_TUTORIAL_ARCHIVED: 409,
  HELP_SLUG_LOCKED: 409,
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
    details?:
      | { gate: string; missing: string[] }
      | { hashes: string[] }
      | { currentRevision: number }
      | { requiredVersion: number }
      | { issues: HelpValidationIssue[] }
    careerLock?: {
      reason: 'future-tier' | 'foundation-first' | 'tier-reward'
      requiredLevel?: string
    }
  }
} {
  const { error, code } = input

  if (error instanceof CourseJourneyLockedError) {
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
  // "Como fazer": o PATCH com `expectedRevision` velho devolve a revisão ATUAL (a outra aba
  // salvou); o publish de rascunho incompleto devolve os BLOQUEIOS campo a campo (o diálogo
  // "Revisar e publicar" do admin aponta cada um).
  if (error instanceof HelpTutorialConflictError) {
    return {
      status: 409,
      body: {
        ...envelope(error.code, error.message),
        details: { currentRevision: error.currentRevision },
      },
    }
  }
  if (error instanceof HelpTutorialInvalidError) {
    return {
      status: 400,
      body: { ...envelope(error.code, error.message), details: { issues: error.issues } },
    }
  }

  // Base vencida das criações: expõe `details.currentRevision` ESTRUTURADO: no DELETE, o
  // cliente decide entre reenviar com a revisão autoritativa (exclusão dele, base velha) e
  // restaurar a versão da nuvem (alguém editou depois) SEM precisar baixar o item para
  // descobrir a revisão (06/09/2026).
  if (error instanceof CreationClientOutdatedError) {
    return {
      status: 409,
      body: {
        ...envelope(error.code, error.message),
        details: { requiredVersion: error.requiredVersion },
      },
    }
  }
  if (error instanceof CreationStaleBaseError) {
    return {
      status: 409,
      body: {
        ...envelope(error.code, error.message),
        details: { currentRevision: error.currentRevision },
      },
    }
  }

  // Partes das criações: expõe `details.hashes` ESTRUTURADO (o cliente comprime só essas
  // e reserva de novo / reenvia).
  if (error instanceof CreationPartsNeedBytesError || error instanceof CreationPartMissingError) {
    return {
      status: 409,
      body: { ...envelope(error.code, error.message), details: { hashes: [...error.hashes] } },
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
