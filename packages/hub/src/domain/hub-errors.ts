import { DomainError } from './shared/errors'

// ── Não encontrado (404) ─────────────────────────────────────────────────────
export class SpaceNotFoundError extends DomainError {
  readonly code = 'SPACE_NOT_FOUND'
  constructor(message = 'Servidor não encontrado') {
    super(message)
  }
}
export class ChannelNotFoundError extends DomainError {
  readonly code = 'CHANNEL_NOT_FOUND'
  constructor(message = 'Canal não encontrado') {
    super(message)
  }
}
export class ThreadNotFoundError extends DomainError {
  readonly code = 'THREAD_NOT_FOUND'
  constructor(message = 'Tópico não encontrado') {
    super(message)
  }
}
export class CommentNotFoundError extends DomainError {
  readonly code = 'COMMENT_NOT_FOUND'
  constructor(message = 'Comentário não encontrado') {
    super(message)
  }
}
export class AttachmentNotFoundError extends DomainError {
  readonly code = 'ATTACHMENT_NOT_FOUND'
  constructor(message = 'Anexo não encontrado') {
    super(message)
  }
}
export class ReportNotFoundError extends DomainError {
  readonly code = 'REPORT_NOT_FOUND'
  constructor(message = 'Denúncia não encontrada') {
    super(message)
  }
}

// ── Acesso / permissão (403) ─────────────────────────────────────────────────
export class AccessDeniedError extends DomainError {
  readonly code = 'ACCESS_DENIED'
  constructor(message = 'Você não tem acesso a este recurso') {
    super(message)
  }
}
/** Canal só permite staff postar, ou tópico travado. → 403. */
export class PostingNotAllowedError extends DomainError {
  readonly code = 'POSTING_NOT_ALLOWED'
  constructor(message = 'Não é permitido postar aqui') {
    super(message)
  }
}
export class UserMutedError extends DomainError {
  readonly code = 'USER_MUTED'
  constructor(message = 'Você está silenciado neste servidor') {
    super(message)
  }
}
export class UserBannedError extends DomainError {
  readonly code = 'USER_BANNED'
  constructor(message = 'Você está banido deste servidor') {
    super(message)
  }
}

// ── Validação (400) ──────────────────────────────────────────────────────────
export class AttachmentTooLargeError extends DomainError {
  readonly code = 'ATTACHMENT_TOO_LARGE'
  constructor(message = 'Anexo acima do limite de tamanho') {
    super(message)
  }
}
export class AttachmentTypeNotAllowedError extends DomainError {
  readonly code = 'ATTACHMENT_TYPE_NOT_ALLOWED'
  constructor(message = 'Tipo de anexo não permitido') {
    super(message)
  }
}
export class TooManyAttachmentsError extends DomainError {
  readonly code = 'TOO_MANY_ATTACHMENTS'
  constructor(message = 'Número de anexos acima do limite') {
    super(message)
  }
}
export class EmojiNotAllowedError extends DomainError {
  readonly code = 'EMOJI_NOT_ALLOWED'
  constructor(message = 'Emoji não permitido') {
    super(message)
  }
}
export class InvalidReorderError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  constructor(message = 'Reordenação inválida (envie os ids exatos dos filhos atuais)') {
    super(message)
  }
}

// ── Conflito (409) ───────────────────────────────────────────────────────────
export class DuplicateSlugError extends DomainError {
  readonly code = 'DUPLICATE_SLUG'
  constructor(message = 'Já existe um recurso com esse identificador (slug)') {
    super(message)
  }
}
export class ConcurrencyConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor(message = 'Conflito de concorrência; tente novamente') {
    super(message)
  }
}
/** Conteúdo já moderado/em estado que não permite a transição pedida. → 409. */
export class InvalidModerationStateError extends DomainError {
  readonly code = 'INVALID_MODERATION_STATE'
  constructor(message = 'Ação de moderação inválida para o estado atual') {
    super(message)
  }
}
