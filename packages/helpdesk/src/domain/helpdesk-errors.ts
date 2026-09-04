import { DomainError } from '@sistemazero/core/errors'

// ── Não encontrado (404) ─────────────────────────────────────────────────────
export class TicketNotFoundError extends DomainError {
  readonly code = 'TICKET_NOT_FOUND'
  constructor(message = 'Ticket não encontrado') {
    super(message)
  }
}
export class KbArticleNotFoundError extends DomainError {
  readonly code = 'KB_ARTICLE_NOT_FOUND'
  constructor(message = 'Artigo não encontrado') {
    super(message)
  }
}

// ── Validação (400) ──────────────────────────────────────────────────────────
export class OAuthStateInvalidError extends DomainError {
  readonly code = 'OAUTH_STATE_INVALID'
  constructor(message = 'Autorização inválida ou expirada — comece a conexão de novo') {
    super(message)
  }
}
export class CustomerTicketCursorInvalidError extends DomainError {
  readonly code = 'CUSTOMER_TICKET_CURSOR_INVALID'
  constructor(message = 'Cursor de paginação inválido; atualize a lista e tente novamente') {
    super(message)
  }
}

// ── Conflito (409) ───────────────────────────────────────────────────────────
export class ConcurrencyConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor(message = 'Conflito de concorrência; recarregue e tente novamente') {
    super(message)
  }
}
export class ConnectionNotConnectedError extends DomainError {
  readonly code = 'CONNECTION_NOT_CONNECTED'
  constructor(message = 'A caixa do Gmail não está conectada — conecte em Configurações') {
    super(message)
  }
}
export class InvalidTicketStateError extends DomainError {
  readonly code = 'INVALID_TICKET_STATE'
  constructor(message = 'Ação inválida para o estado atual do ticket') {
    super(message)
  }
}
// ── Falha de gateway externo (502) ───────────────────────────────────────────
export class GmailSendFailedError extends DomainError {
  readonly code = 'GMAIL_SEND_FAILED'
  constructor(message = 'Não foi possível enviar o e-mail pelo Gmail. Tente novamente') {
    super(message)
  }
}

// ── Infra indisponível (503) ─────────────────────────────────────────────────
export class GmailNotConfiguredError extends DomainError {
  readonly code = 'GMAIL_NOT_CONFIGURED'
  constructor(
    message = 'Integração com o Gmail não configurada (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/HELPDESK_TOKEN_ENC_KEY/OAUTH_PUBLIC_BASE_URL/HELPDESK_APP_URL)',
  ) {
    super(message)
  }
}
export class AiNotConfiguredError extends DomainError {
  readonly code = 'AI_NOT_CONFIGURED'
  constructor(message = 'IA não configurada (OPENROUTER_API_KEY)') {
    super(message)
  }
}
