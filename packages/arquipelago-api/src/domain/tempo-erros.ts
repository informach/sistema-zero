export class EventoTempoConflitanteError extends Error {
  constructor() {
    super('Evento de tempo conflitante')
  }
}

export class SequenciaDeTempoInvalidaError extends Error {
  constructor() {
    super('A sequência da sessão de tempo é inválida')
  }
}
