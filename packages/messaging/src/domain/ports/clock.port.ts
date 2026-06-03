/**
 * Relógio injetável. O domínio/worker NUNCA chamam `new Date()`/`Date.now()`
 * direto — recebem o tempo por aqui, o que torna o agendamento/ritmo testável
 * de forma determinística (relógio fake nos testes).
 */
export interface Clock {
  now(): Date
}

/** Relógio real (produção). */
export const systemClock: Clock = {
  now: () => new Date(),
}
