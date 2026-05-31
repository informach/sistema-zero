/** Erros da borda HTTP relacionados a autenticação/autorização/limites de requisição. */
export class UnauthorizedError extends Error {
  constructor(message = 'Não autorizado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Acesso negado') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class TooManyRequestsError extends Error {
  constructor(readonly retryAfterSeconds?: number) {
    super('Limite de requisições excedido')
    this.name = 'TooManyRequestsError'
  }
}

/** Corpo da requisição acima do limite permitido (proteção anti-DoS). */
export class PayloadTooLargeError extends Error {
  constructor(message = 'Corpo da requisição excede o limite permitido') {
    super(message)
    this.name = 'PayloadTooLargeError'
  }
}
