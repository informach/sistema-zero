import type { MotivoDeBloqueio } from '@sistemazero/arquipelago-contracts'

export class AcessoBloqueadoError extends Error {
  constructor(readonly motivo: MotivoDeBloqueio) {
    super('O jogo não está liberado para esta conta')
  }
}

export class SomenteLeituraError extends Error {
  constructor() {
    super('A sessão de suporte só olha o jogo, sem gravar')
  }
}

export class SalvamentoGrandeDemaisError extends Error {
  constructor() {
    super('Salvamento maior que o permitido')
  }
}

/** O que está guardado não passa no formato atual: nunca sobrescrever com um jogo novo. */
export class SalvamentoIlegivelError extends Error {
  constructor() {
    super('Salvamento guardado em formato desconhecido')
  }
}

/** O Members não está configurado ou não respondeu: desafios e cartões ficam fora por agora. */
export class PlataformaIndisponivelError extends Error {
  constructor(readonly causa?: unknown) {
    super('Os desafios e os cartões não estão disponíveis agora')
  }
}
