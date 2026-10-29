import type { MotivoDeBloqueio } from '@sistemazero/arquipelago-contracts'

export class AcessoBloqueadoError extends Error {
  constructor(readonly motivo: MotivoDeBloqueio) {
    super('O jogo não está liberado para esta conta')
  }
}

/** Os responsáveis desligaram as visitas de irmãos (fase3-12). */
export class VisitasDesligadasError extends Error {
  constructor() {
    super('As visitas entre irmãos estão desligadas pelos responsáveis')
  }
}

/** Não é irmão (outra conta, nunca jogou nela, não vê o jogo) ou é a própria criança. */
export class IrmaoNaoEncontradoError extends Error {
  constructor() {
    super('Irmão não encontrado')
  }
}

export class SomenteLeituraError extends Error {
  constructor() {
    super('A sessão de suporte só olha o jogo, sem gravar')
  }
}

/** Comprar na galeria sem moedas suficientes: nada foi cobrado. */
export class SaldoInsuficienteError extends Error {
  constructor(
    readonly preco: number,
    readonly saldo: number | null,
  ) {
    super('Faltam moedas para esta aparência')
  }
}

/** O salvamento traz uma aparência da galeria que ela não comprou (ou de outro objeto). */
export class AparenciaNaoCompradaError extends Error {
  constructor() {
    super('Esta aparência da galeria ainda não é sua')
  }
}

export class SessaoTempoNaoPermitidaError extends Error {
  constructor() {
    super('A sessão de tempo pertence apenas a perfis Kids')
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

/** Alguém gravou um desafio do manifesto entre a prévia e o aplicar: conferir de novo. */
export class ManifestoDesatualizadoError extends Error {
  constructor() {
    super('Algum desafio do arquivo mudou depois da conferência. Confira de novo antes de aplicar.')
  }
}

/** Não entregar um arquivo que o próprio importador recusaria pelo tamanho. */
export class ManifestoExcedeLimiteError extends Error {
  constructor(limite: number) {
    super(
      `O manifesto aceita até ${limite} desafios. Exporte usando os filtros de público, ilha ou tipo, ou exporte um desafio por vez.`,
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

/** `ARQUIPELAGO_DESAFIOS` desligado (ou só para a equipe e quem chama não é da equipe). */
export class DesafiosDesligadosError extends Error {
  constructor() {
    super('Os desafios ainda não estão ligados')
  }
}

/** A revisão que a pessoa abriu não vale mais (arquivado ou publicação que não existe). */
export class DesafioMudouError extends Error {
  constructor() {
    super('O desafio mudou: abra de novo')
  }
}

/** Ilha fechada ou faltam blocos: o desafio não abre nem confere. */
export class DesafioBloqueadoError extends Error {
  constructor(readonly situacao: 'ilha-fechada' | 'faltam-blocos') {
    super('Este desafio ainda não está liberado')
  }
}
