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

export class DesafioNaoEncontradoError extends Error {
  constructor() {
    super('Desafio não encontrado')
  }
}

/** Outra pessoa da equipe gravou antes: vai junto o que está guardado agora. */
export class DesafioDesatualizadoError extends Error {
  constructor(readonly atual: unknown) {
    super('Outra pessoa salvou este desafio')
  }
}

export class ConflitoDoCadastroError extends Error {
  constructor(readonly motivo: 'slug-em-uso' | 'quadro-ocupado') {
    super(
      motivo === 'slug-em-uso'
        ? 'Outro desafio já usa este identificador'
        : 'Este quadro da ilha já tem um desafio',
    )
  }
}

/** A análise achou problemas: o desafio não pode ser publicado assim. */
export class DesafioComProblemasError extends Error {
  constructor(readonly problemas: { codigo: string; mensagem: string; objetivoId?: string }[]) {
    super('O desafio tem problemas que impedem publicar')
  }
}

export class SemPermissaoDeEscritaError extends Error {
  constructor() {
    super('Só a administração muda os desafios')
  }
}
