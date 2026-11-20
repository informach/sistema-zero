import type {
  ComandoDeCenario,
  DocumentoDeCenario,
  FragmentoBasico,
} from '@sistemazero/molda-cenarios-core/v2'
import type {
  Biblioteca,
  Cenario,
  ConferenciaDeBlob,
  Conjunto,
  Espaco,
  Licenca,
  Modelo,
  Mundo,
  ResumoDeCenario,
  Textura,
  TipoDeBlob,
  TipoDeConteudo,
  VersaoDeConjunto,
} from '../cenarios/cenarios'
import type {
  MovimentoDoHistorico,
  PassoDoHistorico,
  PilhasDoHistorico,
} from '../cenarios/historico'

export interface BlobReservado {
  digest: string
  bytes: number
  tipo: TipoDeBlob
  tipoDoConteudo?: TipoDeConteudo
}

export interface NovoModelo {
  id: string
  nome: string
  pasta: string
  etiquetas: string[]
  digest: string
  bytes: number
  triangulos: number
  min: [number, number, number]
  max: [number, number, number]
  miniatura: string | null
}

export type NovaTextura = Omit<Textura, 'bibliotecaId'>

export interface FiltroDeModelos {
  /** Termos já normalizados; todos precisam aparecer. */
  termos: readonly string[]
  digest?: string
  pasta?: string
  /** Quantos pular (o cursor da página). */
  inicio: number
  limite: number
}

/** A busca de modelos em TODAS as bibliotecas de um espaço (a dos agentes), com medidas. */
export interface FiltroDeModelosNoEspaco {
  /** Termos já normalizados; todos precisam aparecer. */
  termos: readonly string[]
  pasta?: string
  etiqueta?: string
  /** Só estes modelos (o orçamento de um cenário pergunta pelos que ele usa). */
  ids?: readonly string[]
  /** Altura do modelo em metros (max.y - min.y), pela caixa guardada. */
  altura?: { min?: number; max?: number }
  /** O maior lado no chão em metros (o maior entre largura e profundidade). */
  lado?: { min?: number; max?: number }
  inicio: number
  limite: number
}

export interface LoteGravado {
  revisao: number
  /** Verdadeiro quando a mesma operação já tinha sido aplicada antes. */
  repetido: boolean
}

export interface NovoConjunto {
  id: string
  bibliotecaId: string
  operacaoId: string
  nome: string
  pasta: string
  etiquetas: string[]
  conteudo: FragmentoBasico
  autorId: string
}

export interface PublicacaoDeConjunto {
  conjunto: Conjunto
  cenarios: Array<{ id: string; revisao: number }>
}

/** Catálogo e publicação usam a mesma trava e transação que os lotes de cenários. */
export interface ConjuntosRepository {
  conjuntos(
    bibliotecaId: string,
    filtro: FiltroDeModelos,
  ): Promise<{ itens: Conjunto[]; total: number }>
  conjunto(id: string): Promise<Conjunto | null>
  conjuntoDoCenario(cenarioId: string): Promise<Conjunto | null>
  prepararEdicaoDeConjunto(
    id: string,
    autorId: string,
    agora: Date,
  ): Promise<{ mundoId: string; cenarioId: string } | null>
  versaoDoConjunto(id: string, revisao: number): Promise<VersaoDeConjunto | null>
  criarConjunto(dados: NovoConjunto, teto: number, agora: Date): Promise<Conjunto | null>
  editarConjunto(
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[] },
    agora: Date,
  ): Promise<Conjunto | null>
  publicarConjunto(
    dados: {
      id: string
      revisaoEsperada: number
      operacaoId: string
      conteudo: FragmentoBasico
      autorId: string
      rascunho?: { cenarioId: string; revisao: number }
    },
    tetoVersoes: number,
    agora: Date,
  ): Promise<PublicacaoDeConjunto | null>
  definirMiniaturaDoConjunto(
    id: string,
    revisao: number,
    digest: string,
    agora: Date,
    recurso?: { espacoId: string; conferido: ConferenciaDeBlob },
  ): Promise<boolean>
  apagarConjunto(id: string, agora: Date): Promise<string[]>
}

/**
 * Persistência do Molda Cenários. Toda escrita que conta bytes, cria com teto de quantidade ou
 * muda um cenário acontece sob a trava do ESPAÇO, tomada pela implementação: é o que impede
 * duas importações simultâneas de passarem da cota juntas.
 */
export interface CenariosRepository extends ConjuntosRepository {
  /** O espaço da conta, criado na primeira vez. */
  espacoDaConta(contaId: string, limiteBytes: number, agora: Date): Promise<Espaco>
  /** O espaço único da equipe, criado na primeira vez. */
  espacoDaEquipe(limiteBytes: number, agora: Date): Promise<Espaco>
  espaco(id: string): Promise<Espaco | null>

  bibliotecas(espacoId: string): Promise<Biblioteca[]>
  biblioteca(id: string): Promise<Biblioteca | null>
  criarBiblioteca(
    dados: {
      id: string
      espacoId: string
      nome: string
      licenca: Licenca
      criadoPor: string
      fonte?: string
      descricao?: string
    },
    teto: number,
    agora: Date,
  ): Promise<Biblioteca | null>
  editarBiblioteca(
    id: string,
    dados: { nome?: string; licenca?: Licenca; descricao?: string; capaModelo?: string | null },
    agora: Date,
  ): Promise<Biblioteca | null>
  /** Apaga a biblioteca e os modelos dela; devolve os digests que ficaram sem dono. */
  apagarBiblioteca(id: string, agora: Date): Promise<string[]>

  modelos(
    bibliotecaId: string,
    filtro: FiltroDeModelos,
  ): Promise<{ itens: Modelo[]; total: number }>
  /** Modelos de todas as bibliotecas do espaço, na mesma ordem da listagem por biblioteca. */
  modelosNoEspaco(
    espacoId: string,
    filtro: FiltroDeModelosNoEspaco,
  ): Promise<{ itens: Modelo[]; total: number }>
  modelo(id: string): Promise<Modelo | null>
  organizacao(bibliotecaId: string): Promise<{ pastas: string[]; etiquetas: string[] }>
  /**
   * Reserva arquivos no espaço. Devolve os que ainda precisam subir (os já confirmados não
   * sobem de novo) ou nulo quando a cota não comporta a reserva inteira.
   */
  reservarBlobs(
    espacoId: string,
    blobs: readonly BlobReservado[],
    agora: Date,
    venceEm: Date,
  ): Promise<{ faltam: BlobReservado[] } | null>
  /** O BFF apagou do armazenamento estes arquivos sem dono: a reserva deles volta a valer. */
  arquivosSairam(espacoId: string, digests: readonly string[]): Promise<void>
  /** Marca como enviados os arquivos que o BFF conferiu no bucket. */
  confirmarBlobs(
    espacoId: string,
    conferidos: readonly ConferenciaDeBlob[],
    agora: Date,
  ): Promise<void>
  /** Dos digests dados, quais estão confirmados neste espaço (com o tipo de cada um). */
  blobsConfirmados(
    espacoId: string,
    digests: readonly string[],
  ): Promise<Map<string, { tipo: TipoDeBlob; bytes: number; tipoDoConteudo: TipoDeConteudo }>>
  /** Cria os modelos que ainda não existem na biblioteca (mesmo conteúdo não repete). */
  criarModelos(
    bibliotecaId: string,
    modelos: readonly NovoModelo[],
    teto: number,
    criadoPor: string,
    agora: Date,
  ): Promise<Modelo[] | null>
  editarModelo(
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[] },
    agora: Date,
  ): Promise<Modelo | null>
  /** Apaga modelos de UMA biblioteca; devolve os digests que ficaram sem dono. */
  apagarModelos(bibliotecaId: string, ids: readonly string[], agora: Date): Promise<string[]>

  texturas(
    bibliotecaId: string,
    filtro: FiltroDeModelos,
  ): Promise<{ itens: Textura[]; total: number }>
  textura(id: string): Promise<Textura | null>
  criarTexturas(
    bibliotecaId: string,
    texturas: readonly NovaTextura[],
    teto: number,
    criadoPor: string,
    agora: Date,
    conferidos: readonly ConferenciaDeBlob[],
  ): Promise<Textura[] | null>
  editarTextura(
    id: string,
    dados: { nome?: string; pasta?: string; etiquetas?: string[]; repeticaoMetros?: number },
    agora: Date,
  ): Promise<Textura | null>
  apagarTexturas(bibliotecaId: string, ids: readonly string[], agora: Date): Promise<string[]>

  mundos(espacoId: string): Promise<Mundo[]>
  mundo(id: string): Promise<Mundo | null>
  criarMundo(
    dados: { id: string; espacoId: string; nome: string; criadoPor: string },
    teto: number,
    agora: Date,
  ): Promise<Mundo | null>
  editarMundo(
    id: string,
    dados: { nome?: string; bibliotecas?: string[] },
    agora: Date,
  ): Promise<Mundo | null>
  /** Exclui e devolve somente arquivos que ficaram sem referências, inclusive no histórico. */
  apagarMundo(id: string): Promise<string[]>

  cenarios(mundoId: string): Promise<ResumoDeCenario[]>
  cenario(id: string): Promise<Cenario | null>
  criarCenario(
    dados: {
      id: string
      mundoId: string
      nome: string
      documento: DocumentoDeCenario
      criadoPor: string
    },
    teto: number,
    agora: Date,
  ): Promise<ResumoDeCenario | null>
  /** A revisão que uma operação já aplicada produziu, ou nulo. */
  operacaoAplicada(cenarioId: string, operacaoId: string): Promise<number | null>
  pilhasDoHistorico(cenarioId: string): Promise<PilhasDoHistorico>
  inicioDoHistorico(cenarioId: string): Promise<number | null>
  passoDoHistorico(cenarioId: string, revisao: number): Promise<PassoDoHistorico | null>
  /** Resumos paginados; comandos só são lidos para desfazer, refazer ou restaurar. */
  revisoes(
    cenarioId: string,
    antes: number | undefined,
    limite: number,
  ): Promise<Array<{ revisao: number; autorId: string; criadoEm: Date }>>
  fotografia(
    cenarioId: string,
    revisao: number,
  ): Promise<{ revisao: number; documento: DocumentoDeCenario } | null>
  lotesEntre(
    cenarioId: string,
    depois: number,
    ate: number,
  ): Promise<Array<{ revisao: number; comandos: ComandoDeCenario[] }>>
  /**
   * Grava o lote se a revisão guardada ainda é a esperada. Nulo = outra edição chegou antes.
   * A mesma operação mandada duas vezes devolve a revisão da primeira, sem gravar de novo.
   */
  gravarLote(
    dados: {
      cenarioId: string
      revisaoEsperada: number
      documento: DocumentoDeCenario
      comandos: ComandoDeCenario[]
      operacaoId: string
      autorId: string
      movimento?: MovimentoDoHistorico
      /** Prova do BFF; confirmação e documento são gravados na mesma transação. */
      recursosConferidos?: readonly ConferenciaDeBlob[]
    },
    agora: Date,
  ): Promise<LoteGravado | null>
  retratos(cenarioId: string, revisoes: readonly number[]): Promise<Map<number, string>>
  definirCapa(
    dados: {
      cenarioId: string
      revisao: number
      digest: string
      autorId: string
      recurso?: { espacoId: string; conferido: ConferenciaDeBlob | null }
    },
    agora: Date,
  ): Promise<{ revisao: number; digest: string; atual: boolean; apagar: string[] } | null>
  apagarCenario(id: string): Promise<string[]>
}
