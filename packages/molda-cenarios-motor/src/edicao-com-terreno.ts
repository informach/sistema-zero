import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  documentoDaOperacaoDeCaminho,
  executarLote,
  type OperacaoDeAguaPreparada,
  type OperacaoDeCaminhoPreparada,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core/v2'

/** A prévia pertence a uma cabeça e nunca substitui o documento autoral. */
type Operacao = OperacaoDeAguaPreparada | OperacaoDeCaminhoPreparada
export type ComandoDePreviaDoAmbiente = Extract<
  ComandoDeCenario,
  { tipo: 'iluminacao.definir' | 'marcador.definir' | 'textura.definir' }
>
export type DonoDaPreviaDoAmbiente = 'jogo' | 'luz'
export class EdicaoComTerreno {
  private previa: {
    origem: DocumentoDeCenario
    visual: DocumentoDeCenario
    tipo: 'agua' | 'caminho' | 'ambiente'
    dono?: DonoDaPreviaDoAmbiente
  } | null = null
  constructor(
    private readonly terreno: {
      prever(operacao: Operacao): void
      restaurar(): void
    },
  ) {}
  get ativa() {
    return this.previa !== null
  }
  get tipo() {
    return this.previa?.tipo ?? null
  }
  get dono() {
    return this.previa?.dono ?? null
  }
  prever(origem: DocumentoDeCenario, atual: DocumentoDeCenario | null, operacao: Operacao) {
    if (atual !== origem)
      throw new DOMException('O cenário mudou durante a preparação', 'AbortError')
    const tipo = 'agua' in operacao ? 'agua' : 'caminho'
    if (this.previa && this.previa.tipo !== tipo)
      throw Error('Termine a prévia atual antes de preparar outra ferramenta.')
    const substituir = <T extends { id: string }>(lista: readonly T[], item: T) =>
      lista.some((v) => v.id === item.id)
        ? lista.map((v) => (v.id === item.id ? item : v))
        : [...lista, item]
    const visual =
      'agua' in operacao
        ? validarDocumento({ ...origem, aguas: substituir(origem.aguas, operacao.agua) })
        : documentoDaOperacaoDeCaminho(origem, operacao)
    this.finalizar(true)
    try {
      if (operacao.terreno) this.terreno.prever(operacao)
      this.previa = { origem, visual, tipo }
    } catch (erro) {
      this.terreno.restaurar()
      throw erro
    }
  }
  projetar(atual: DocumentoDeCenario): DocumentoDeCenario {
    if (this.previa && this.previa.origem !== atual) this.finalizar(true)
    return this.previa?.visual ?? atual
  }
  preverComandos(
    origem: DocumentoDeCenario,
    atual: DocumentoDeCenario | null,
    comandos: readonly ComandoDePreviaDoAmbiente[],
    dono: DonoDaPreviaDoAmbiente = 'luz',
  ) {
    if (atual !== origem)
      throw new DOMException('O cenário mudou durante a preparação', 'AbortError')
    if (this.previa && (this.previa.tipo !== 'ambiente' || this.previa.dono !== dono))
      throw Error('Termine a prévia atual antes de preparar outra ferramenta.')
    if (
      comandos.some(
        (c) => !['iluminacao.definir', 'marcador.definir', 'textura.definir'].includes(c.tipo),
      )
    )
      throw Error(
        'A prévia de ambiente aceita somente iluminação, marcadores e referências de textura.',
      )
    const visual = executarLote(
      { documento: origem, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos,
      },
    ).documento
    this.previa = { origem, visual, tipo: 'ambiente', dono }
  }
  finalizar(
    cancelar: boolean,
    tipo?: 'agua' | 'caminho' | 'ambiente',
    dono?: DonoDaPreviaDoAmbiente,
  ) {
    if (!this.previa) return
    if (tipo && this.previa.tipo !== tipo) return
    if (dono && this.previa.dono !== dono) return
    const alterouTerreno = this.previa.tipo !== 'ambiente'
    this.previa = null
    if (cancelar && alterouTerreno) this.terreno.restaurar()
  }
}
