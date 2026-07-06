import { DomainError } from '@sistemazero/core/errors'

/** E-mail já cadastrado (conflito de unicidade no registro). → 409 */
export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'EMAIL_ALREADY_IN_USE'
  constructor() {
    super('E-mail já cadastrado')
  }
}

/**
 * Credenciais inválidas no login. Mensagem GENÉRICA de propósito: não revela se
 * foi o e-mail (inexistente) ou a senha (errada) — evita enumeração de contas. → 401
 */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS'
  constructor() {
    super('Credenciais inválidas')
  }
}

/** Usuário não encontrado (resolução por id). → 404 */
export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND'
  constructor() {
    super('Usuário não encontrado')
  }
}

/** Conta não está ativa (pendente/suspensa/bloqueada). → 403 */
export class UserNotActiveError extends DomainError {
  readonly code = 'USER_NOT_ACTIVE'
  constructor(message = 'Conta inativa') {
    super(message)
  }
}

/**
 * Conta ainda NÃO definiu a própria senha (convite/compra pendente): o login por
 * CÓDIGO (OTP) é recusado — senão a pessoa entra numa sessão que a área dos pais
 * (que valida a senha real) nunca deixa passar. Ela precisa definir a senha pelo
 * link de 1º acesso (ou "esqueci minha senha"). → 403 */
export class PasswordNotSetError extends DomainError {
  readonly code = 'PASSWORD_NOT_SET'
  constructor() {
    super('Defina sua senha pelo link de primeiro acesso antes de entrar')
  }
}

/** Refresh token ausente, inválido, expirado ou revogado. → 401 */
export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'INVALID_REFRESH_TOKEN'
  constructor() {
    super('Refresh token inválido ou expirado')
  }
}

/**
 * Conflito de concorrência otimista: a `version` esperada não bateu com a do
 * banco (alguém editou o usuário em paralelo). A borda re-lê e tenta de novo. → 409
 */
export class VersionConflictError extends DomainError {
  readonly code = 'VERSION_CONFLICT'
  constructor() {
    super('Registro alterado por outra operação; recarregue e tente de novo')
  }
}
