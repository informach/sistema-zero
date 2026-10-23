export class PensaUnavailable extends Error {
  constructor(
    message: string,
    readonly code = 'RESOURCES_UNAVAILABLE',
    readonly status = 503,
  ) {
    super(message)
    this.name = 'PensaUnavailable'
  }
}

export class PensaOutputInvalid extends Error {
  constructor(readonly reason: string) {
    super('Não consegui organizar esta parte. Sua ideia continua guardada.')
    this.name = 'PensaOutputInvalid'
  }
}
