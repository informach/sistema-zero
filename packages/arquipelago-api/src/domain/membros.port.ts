import type { JornadaDosMembros } from '@sistemazero/arquipelago-contracts'

/** Leituras do serviço do jogo no Members (rotas internas, token próprio). */
export interface PortaDosMembros {
  lerJornada(signal?: AbortSignal): Promise<JornadaDosMembros>
}

/** O Members não respondeu, respondeu erro ou mandou um formato que o contrato não aceita. */
export class MembrosIndisponiveisError extends Error {
  constructor(
    readonly motivo: 'rede' | 'status' | 'formato',
    readonly status?: number,
  ) {
    super('Members indisponível para o jogo')
    this.name = 'MembrosIndisponiveisError'
  }
}
