import type {
  ComandoDeCenario,
  DocumentoDeCenario,
  FragmentoBasico,
} from '@sistemazero/molda-cenarios-core/v2'

/**
 * Tudo o que a oficina de cenários pede a quem a hospeda. A ferramenta não sabe de sessão, de
 * rede nem de onde os arquivos moram: o app (ou o playground, ou um teste) entrega um host.
 */

export type Licenca = 'livre' | 'propria' | 'restrita'

export interface Espaco {
  id: string
  tipo: 'conta' | 'equipe'
  nome: string
  usadoBytes: number
  limiteBytes: number
}

export interface Biblioteca {
  id: string
  espacoId: string
  nome: string
  fonte?: string | null
  descricao?: string
  capaModelo?: string | null
  licenca: Licenca
  modelos: number
  texturas?: number
  /** Endereço da imagem de capa, ou nulo. */
  capa: string | null
  atualizadaEm: string
}

export interface ModeloDeBiblioteca {
  id: string
  bibliotecaId: string
  nome: string
  /** Caminho dentro da biblioteca, com `/` entre os níveis. Vazio = raiz. */
  pasta: string
  etiquetas: string[]
  digest: string
  bytes: number
  triangulos: number
  min: [number, number, number]
  max: [number, number, number]
  /** Endereço do retrato, ou nulo. */
  miniatura: string | null
}

export interface PaginaDeModelos {
  itens: ModeloDeBiblioteca[]
  total: number
  /** Passe de volta em `cursor` para a página seguinte; nulo no fim. */
  proximo: string | null
}

/** A busca dos agentes no espaço inteiro: tamanho em metros pela caixa de cada modelo. */
export interface FiltroDeModelosNoEspaco {
  busca?: string
  pasta?: string
  etiqueta?: string
  /** Só estes modelos (até 200): o orçamento pergunta pelos que um cenário usa. */
  ids?: readonly string[]
  alturaMin?: number
  alturaMax?: number
  /** O maior lado no chão (largura ou profundidade). */
  ladoMin?: number
  ladoMax?: number
  cursor?: string | null
  limite?: number
}

export interface FiltroDeModelos {
  busca?: string
  pasta?: string
  digest?: string
  cursor?: string | null
  limite?: number
}

/** Um modelo já conferido, medido e fotografado no navegador, pronto para subir. */
export interface ModeloParaImportar {
  nome: string
  pasta: string
  etiquetas: string[]
  conteudo: Uint8Array
  digest: string
  miniatura: Blob
  min: [number, number, number]
  max: [number, number, number]
  triangulos: number
}

export interface TexturaDeBiblioteca {
  id: string
  bibliotecaId: string
  nome: string
  pasta: string
  etiquetas: string[]
  digest: string
  bytes: number
  largura: number
  altura: number
  repeticaoMetros: number
  imagem: string
}
export type TexturaParaImportar = Omit<
  TexturaDeBiblioteca,
  'id' | 'bibliotecaId' | 'bytes' | 'imagem'
> & { conteudo: Blob }
export interface PaginaDeTexturas {
  itens: TexturaDeBiblioteca[]
  total: number
  proximo: string | null
}
export interface FonteDeTexturas {
  listar(sinal?: AbortSignal): Promise<MoldeDisponivel[]>
  preparar(
    bibliotecaId: string,
    item: MoldeDisponivel,
    sinal?: AbortSignal,
  ): Promise<TexturaDeBiblioteca>
}

export interface ConjuntoDeBiblioteca {
  id: string
  bibliotecaId: string
  nome: string
  pasta: string
  etiquetas: string[]
  revisao: number
  cenarioDeEdicaoId: string | null
  revisaoPublicadaDoCenario: number | null
  /** Endereço da miniatura da revisão atual, nunca do rascunho não publicado. */
  miniatura: string | null
  bytes: number
  objetos: number
  atualizadoEm: string
}
export interface VersaoDeConjunto {
  conjuntoId: string
  revisao: number
  nome: string
  conteudo: FragmentoBasico
  miniatura: string | null
  bytes: number
  objetos: number
  criadoEm: string
}
export interface ConjuntoParaCriar {
  nome: string
  pasta?: string
  etiquetas?: string[]
  conteudo: FragmentoBasico
  operacaoId: string
}
export interface PublicacaoDeConjunto {
  revisaoEsperada: number
  operacaoId: string
  conteudo: FragmentoBasico
  rascunho?: { cenarioId: string; revisao: number }
}
export interface EdicaoDeConjunto {
  conjunto: ConjuntoDeBiblioteca
  mundo: Mundo
  cenario: CenarioAberto
}

export interface MoldeDisponivel {
  origem: 'molda'
  id: string
  nome: string
  miniatura: string | null
  revisao: string
  atualizadoEm: number
}

export type EscolhaDeModelo = ModeloDeBiblioteca | MoldeDisponivel
export type ResultadoDoMolde =
  | { ok: true; modelo: ModeloDeBiblioteca }
  | { ok: false; token: string; avisos: string[] }

export interface FonteDeMoldes {
  listar(sinal?: AbortSignal): Promise<MoldeDisponivel[]>
  preparar(
    espacoId: string,
    molde: MoldeDisponivel,
    sinal?: AbortSignal,
    aceite?: string,
  ): Promise<ResultadoDoMolde>
}

export interface Mundo {
  id: string
  espacoId: string
  bibliotecaConjuntosId?: string | null
  nome: string
  cenarios: number
  /** Bibliotecas que este mundo usa. */
  bibliotecas: string[]
  capa: string | null
  atualizadoEm: string
}

export interface ResumoDeCenario {
  id: string
  mundoId: string
  nome: string
  revisao: number
  capa: string | null
  atualizadoEm: string
}

export interface CenarioAberto {
  resumo: ResumoDeCenario
  documento: DocumentoDeCenario
  revisao: number
  historico: { revisao: number; desfazer: number; refazer: number }
}
export type RecursoDeTerrenoParaGravar =
  import('@sistemazero/molda-cenarios-core/v2').ArquivoDeTerreno
export interface PaginaDeRevisoes {
  inicio: number | null
  retratoInicial: string | null
  itens: Array<{ revisao: number; criadoEm: string; miniatura: string | null }>
  proximo: number | null
}

/** O cenário mudou em outro lugar: a revisão que quem editava conhecia ficou para trás. */
export class CenarioDesatualizado extends Error {
  constructor(public readonly revisaoAtual: number) {
    super('O cenário mudou em outro lugar')
    this.name = 'CenarioDesatualizado'
  }
}

export interface CenariosHost {
  /** Publicação autorizada da equipe; o host de ensaio mantém estado separado. */
  publicacoes?: import('./publicacoes').PublicacoesDeCenariosHost
  espacos(): Promise<Espaco[]>
  /**
   * As ferramentas que o servidor liga por interruptor (lote 7 da conclusão, 22/11/2026). Hoje só
   * `regioes`, o `CENARIOS_REGIOES` do Members: desligado, a ferramenta Regiões não aparece (e o
   * servidor recusa mudar as regiões). Sem o método, nada fica ligado.
   */
  recursos?(): Promise<{ regioes: boolean }>

  listarBibliotecas(espacoId: string): Promise<Biblioteca[]>
  obterBibliotecaDoMolda(espacoId: string): Promise<Biblioteca>
  /** Fonte viva do perfil. As cópias só viram modelos guardados quando escolhidas. */
  molda?: FonteDeMoldes
  texturasMolda?: FonteDeTexturas
  criarBiblioteca(
    espacoId: string,
    dados: { nome: string; licenca: Licenca; descricao?: string },
  ): Promise<Biblioteca>
  editarBiblioteca(
    id: string,
    dados: { nome?: string; licenca?: Licenca; descricao?: string; capaModelo?: string | null },
  ): Promise<Biblioteca>
  apagarBiblioteca(id: string): Promise<void>

  listarModelos(bibliotecaId: string, filtro?: FiltroDeModelos): Promise<PaginaDeModelos>
  /** Modelos de todas as bibliotecas do espaço, por nome, pasta, etiqueta, tamanho ou ids. */
  buscarModelosNoEspaco(
    espacoId: string,
    filtro?: FiltroDeModelosNoEspaco,
  ): Promise<PaginaDeModelos>
  organizacaoDaBiblioteca(bibliotecaId: string): Promise<{ pastas: string[]; etiquetas: string[] }>
  importarModelos(
    bibliotecaId: string,
    modelos: ModeloParaImportar[],
    aoAndar?: (feitos: number, total: number) => void,
    sinal?: AbortSignal,
  ): Promise<ModeloDeBiblioteca[]>
  editarModelo(
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[] },
  ): Promise<ModeloDeBiblioteca>
  apagarModelos(bibliotecaId: string, ids: string[]): Promise<void>
  listarTexturas(bibliotecaId: string, filtro?: FiltroDeModelos): Promise<PaginaDeTexturas>
  importarTexturas(
    bibliotecaId: string,
    texturas: TexturaParaImportar[],
    aoAndar?: (feitos: number, total: number) => void,
    sinal?: AbortSignal,
  ): Promise<TexturaDeBiblioteca[]>
  editarTextura(
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[]; repeticaoMetros?: number },
  ): Promise<TexturaDeBiblioteca>
  apagarTexturas(bibliotecaId: string, ids: string[]): Promise<void>
  listarConjuntos(
    bibliotecaId: string,
    filtro?: FiltroDeModelos,
  ): Promise<{ itens: ConjuntoDeBiblioteca[]; total: number; proximo: string | null }>
  obterConjunto(id: string): Promise<ConjuntoDeBiblioteca>
  versaoDoConjunto(id: string, revisao: number): Promise<VersaoDeConjunto>
  criarConjunto(bibliotecaId: string, dados: ConjuntoParaCriar): Promise<ConjuntoDeBiblioteca>
  editarConjunto(
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[] },
  ): Promise<ConjuntoDeBiblioteca>
  editarConjuntoNaOficina(id: string): Promise<EdicaoDeConjunto>
  publicarConjunto(
    id: string,
    dados: PublicacaoDeConjunto,
  ): Promise<{ conjunto: ConjuntoDeBiblioteca; cenarios: Array<{ id: string; revisao: number }> }>
  apagarConjunto(id: string): Promise<void>
  guardarMiniaturaDoConjunto(
    id: string,
    revisao: number,
    imagem: Blob,
    sinal?: AbortSignal,
  ): Promise<void>
  /** O arquivo `.glb` de um modelo, pelo conteúdo. */
  conteudoDoModelo(
    ref: {
      biblioteca: string
      digest: string
      espacoId?: string
    },
    sinal?: AbortSignal,
  ): Promise<ArrayBuffer>
  conteudoDaTextura(
    ref: { biblioteca: string; digest: string; espacoId?: string },
    sinal?: AbortSignal,
  ): Promise<ArrayBuffer>
  conteudoDoTerreno(cenarioId: string, digest: string, sinal?: AbortSignal): Promise<ArrayBuffer>
  guardarRecursos(
    cenarioId: string,
    pecas: readonly RecursoDeTerrenoParaGravar[],
    sinal?: AbortSignal,
  ): Promise<{ espacoId: string; digests: string[] }>

  listarMundos(espacoId: string): Promise<Mundo[]>
  obterMundo(id: string): Promise<Mundo>
  criarMundo(espacoId: string, nome: string): Promise<Mundo>
  editarMundo(id: string, dados: { nome?: string; bibliotecas?: string[] }): Promise<Mundo>
  apagarMundo(id: string): Promise<void>

  listarCenarios(mundoId: string): Promise<ResumoDeCenario[]>
  criarCenario(mundoId: string, nome: string): Promise<ResumoDeCenario>
  abrirCenario(id: string): Promise<CenarioAberto>
  /** Só a revisão guardada e as pilhas de desfazer: a consulta leve da edição ao vivo. */
  historicoDoCenario(id: string): Promise<CenarioAberto['historico']>
  prepararExportacao(
    id: string,
    revisaoEsperada: number,
    sinal?: AbortSignal,
  ): Promise<import('@sistemazero/molda-cenarios-core/compilar').PreparoDeExportacao>
  moverHistorico(
    id: string,
    revisaoEsperada: number,
    acao: 'desfazer' | 'refazer',
    operacaoId: string,
  ): Promise<CenarioAberto>
  listarRevisoes(id: string, antes?: number): Promise<PaginaDeRevisoes>
  restaurarRevisao(
    id: string,
    revisaoEsperada: number,
    revisao: number,
    operacaoId: string,
  ): Promise<CenarioAberto>
  /** Aplica um lote. Recusa com `CenarioDesatualizado` quando a revisão esperada ficou para trás. */
  editarCenario(
    id: string,
    revisaoEsperada: number,
    comandos: ComandoDeCenario[],
    operacaoId: string,
    recursos?: { espacoId: string; digests: string[] },
  ): Promise<{ revisao: number }>
  duplicarCenario(id: string): Promise<ResumoDeCenario>
  apagarCenario(id: string): Promise<void>
  /** Guarda o retrato do cenário que aparece nos cartões. */
  guardarCapa(
    cenarioId: string,
    revisao: number,
    imagem: Blob,
    sinal?: AbortSignal,
  ): Promise<string>
}
