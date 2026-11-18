import {
  type DocumentoDeCenario,
  type OperacaoDeAguaPreparada,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core/v2'

/** A prévia pertence a uma cabeça e nunca substitui o documento autoral. */
export class EdicaoDaAgua {
  private previa: { origem: DocumentoDeCenario; visual: DocumentoDeCenario } | null = null
  constructor(
    private readonly terreno: {
      prever(operacao: OperacaoDeAguaPreparada): void
      restaurar(): void
    },
  ) {}
  get ativa() {
    return this.previa !== null
  }
  prever(
    origem: DocumentoDeCenario,
    atual: DocumentoDeCenario | null,
    operacao: OperacaoDeAguaPreparada,
  ) {
    if (atual !== origem)
      throw new DOMException('O cenário mudou durante a preparação da água', 'AbortError')
    const aguas = origem.aguas.filter((a) => a.id !== operacao.agua.id)
    aguas.push(operacao.agua)
    const visual = validarDocumento({ ...origem, aguas })
    this.finalizar(true)
    try {
      if (operacao.terreno) this.terreno.prever(operacao)
      this.previa = { origem, visual }
    } catch (erro) {
      this.terreno.restaurar()
      throw erro
    }
  }
  projetar(atual: DocumentoDeCenario): DocumentoDeCenario {
    if (this.previa && this.previa.origem !== atual) this.finalizar(true)
    return this.previa?.visual ?? atual
  }
  finalizar(cancelar: boolean) {
    if (!this.previa) return
    this.previa = null
    if (cancelar) this.terreno.restaurar()
  }
}
