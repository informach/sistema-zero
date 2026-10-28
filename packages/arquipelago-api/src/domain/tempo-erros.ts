export class EventoTempoConflitanteError extends Error {
  constructor() {
    super('Evento de tempo conflitante')
  }
}

export class DataTempoInvalidaError extends Error {
  constructor() {
    super('Data de tempo futura')
  }
}
