import { DomainError } from '@sistemazero/core/errors'

// ── Não encontrado (404) ─────────────────────────────────────────────────────
export class IdeaNotFoundError extends DomainError {
  readonly code = 'IDEA_NOT_FOUND'
  constructor(message = 'Ideia não encontrada') {
    super(message)
  }
}
export class ContentNotFoundError extends DomainError {
  readonly code = 'CONTENT_NOT_FOUND'
  constructor(message = 'Conteúdo não encontrado') {
    super(message)
  }
}
export class ChecklistItemNotFoundError extends DomainError {
  readonly code = 'CHECKLIST_ITEM_NOT_FOUND'
  constructor(message = 'Item do checklist não encontrado') {
    super(message)
  }
}
export class PublicationNotFoundError extends DomainError {
  readonly code = 'PUBLICATION_NOT_FOUND'
  constructor(message = 'Publicação não encontrada') {
    super(message)
  }
}
export class AssetNotFoundError extends DomainError {
  readonly code = 'ASSET_NOT_FOUND'
  constructor(message = 'Arquivo de mídia não encontrado') {
    super(message)
  }
}
export class AccountNotFoundError extends DomainError {
  readonly code = 'ACCOUNT_NOT_FOUND'
  constructor(message = 'Conta social não encontrada') {
    super(message)
  }
}
export class NetworkNotSupportedError extends DomainError {
  readonly code = 'NETWORK_NOT_SUPPORTED'
  constructor(message = 'Rede social não suportada nesta operação') {
    super(message)
  }
}

// ── Validação (400) ──────────────────────────────────────────────────────────
export class AssetTooLargeError extends DomainError {
  readonly code = 'ASSET_TOO_LARGE'
  constructor(message = 'Arquivo acima do limite de tamanho') {
    super(message)
  }
}
export class AssetTypeNotAllowedError extends DomainError {
  readonly code = 'ASSET_TYPE_NOT_ALLOWED'
  constructor(message = 'Tipo de arquivo não permitido') {
    super(message)
  }
}
export class OAuthStateInvalidError extends DomainError {
  readonly code = 'OAUTH_STATE_INVALID'
  constructor(message = 'Autorização inválida ou expirada — comece a conexão de novo') {
    super(message)
  }
}
export class DriveFileInvalidError extends DomainError {
  readonly code = 'DRIVE_FILE_INVALID'
  constructor(message = 'Arquivo do Drive inválido — cole o link do arquivo ou escolha na lista') {
    super(message)
  }
}

// ── Conflito (409) ───────────────────────────────────────────────────────────
export class IdeaNotPromotableError extends DomainError {
  readonly code = 'IDEA_NOT_PROMOTABLE'
  constructor(message = 'Só ideias no inbox podem ser promovidas') {
    super(message)
  }
}
export class InvalidIdeaStatusChangeError extends DomainError {
  readonly code = 'INVALID_IDEA_STATUS_CHANGE'
  constructor(
    message = 'Mudança de status inválida — aceitar uma ideia é só pela promoção (que cria o conteúdo)',
  ) {
    super(message)
  }
}
export class InvalidStageTransitionError extends DomainError {
  readonly code = 'INVALID_STAGE_TRANSITION'
  constructor(message = 'Mudança de etapa inválida para o estado atual') {
    super(message)
  }
}
export class ChecklistIncompleteError extends DomainError {
  readonly code = 'CHECKLIST_INCOMPLETE'
  constructor(message = 'Conclua o checklist antes de aprovar este conteúdo') {
    super(message)
  }
}
export class ContentNotApprovedError extends DomainError {
  readonly code = 'CONTENT_NOT_APPROVED'
  constructor(message = 'O conteúdo precisa estar aprovado para gerar publicações') {
    super(message)
  }
}
export class InvalidPublicationStateError extends DomainError {
  readonly code = 'INVALID_PUBLICATION_STATE'
  constructor(message = 'Ação inválida para o estado atual da publicação') {
    super(message)
  }
}
export class AutoPublishUnavailableError extends DomainError {
  readonly code = 'AUTO_PUBLISH_UNAVAILABLE'
  constructor(
    message = 'Publicação automática indisponível para esta rede — conecte a conta ou use o modo lembrete',
  ) {
    super(message)
  }
}
export class AssetNotReadyError extends DomainError {
  readonly code = 'ASSET_NOT_READY'
  constructor(message = 'O arquivo ainda não terminou de subir') {
    super(message)
  }
}
export class ConcurrencyConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor(message = 'Conflito de concorrência; recarregue e tente novamente') {
    super(message)
  }
}
export class AccountNotConnectedError extends DomainError {
  readonly code = 'ACCOUNT_NOT_CONNECTED'
  constructor(message = 'Nenhuma conta conectada desta rede — conecte em Conexões') {
    super(message)
  }
}

// ── Infra indisponível (503) ─────────────────────────────────────────────────
export class MediaNotConfiguredError extends DomainError {
  readonly code = 'MEDIA_NOT_CONFIGURED'
  constructor(
    message = 'Armazenamento de mídia não configurado (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_MARKETING_BUCKET)',
  ) {
    super(message)
  }
}
export class OAuthNotConfiguredError extends DomainError {
  readonly code = 'OAUTH_NOT_CONFIGURED'
  constructor(
    message = 'OAuth do Google não configurado (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/MARKETING_TOKEN_ENC_KEY/OAUTH_PUBLIC_BASE_URL/MARKETING_APP_URL)',
  ) {
    super(message)
  }
}
