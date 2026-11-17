import type {
  DocumentoDeCenario,
  EncaixeDeComposicao,
  FonteDeAlturas,
  InstanciaDeCenario,
  ModeloDoCenario,
  Transformacao,
  VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'

export type Ferramenta = 'selecionar' | 'mover' | 'girar' | 'tamanho'
export type Vista = 'livre' | 'cima' | 'frente' | 'lado'
export type Tema = 'light' | 'dark'

export type Encaixe = Pick<EncaixeDeComposicao, 'grade' | 'angulo'> &
  Partial<Omit<EncaixeDeComposicao, 'grade' | 'angulo'>>

export interface Ponto3 {
  x: number
  y: number
  z: number
  apoio?: InstanciaDeCenario['apoio']
}

export interface MudancaDeTransformacao {
  id: string
  /** Em coordenadas de MUNDO. Quem grava converte para o apoio do objeto. */
  transformacao: Transformacao
  apoio?: InstanciaDeCenario['apoio']
}

export interface Estatisticas {
  objetos: number
  triangulos: number
  desenhos: number
  /** Modelos da tabela do cenário que ainda estão chegando. */
  carregando: number
}

export interface OpcoesDoPalco {
  /** Os bytes do GLB de um modelo da tabela do cenário. O host decide de onde vêm. */
  carregarModelo(modelo: ModeloDoCenario): Promise<ArrayBuffer>
  carregarTerreno?(digest: string, sinal: AbortSignal): Promise<ArrayBuffer>
  aoTerreno?(evento: {
    estado: 'carregando' | 'pronto' | 'erro'
    chave: string
    erro?: unknown
  }): void
  /** Toque num objeto (ou no vazio, com `null`). `somar` = Shift ou Ctrl apertado. */
  aoSelecionar?(id: string | null, somar: boolean): void
  /** Fim de um gesto de mover, girar ou mudar o tamanho. */
  aoTransformar?(mudancas: MudancaDeTransformacao[]): void
  aoGesto?(ativo: boolean): void
  aoMedir?(estatisticas: Estatisticas): void
  aoFalhar?(modelo: ModeloDoCenario, erro: unknown): void
  tema?: Tema
  movimentoReduzido?: boolean
}

export interface Palco {
  definirDocumento(documento: DocumentoDeCenario): void
  definirSelecao(ids: readonly string[]): void
  definirFerramenta(ferramenta: Ferramenta): void
  definirEncaixe(encaixe: Encaixe): void
  definirTema(tema: Tema): void
  definirVista(vista: Vista): void
  /** O ponto do chão debaixo de uma posição da tela, já no encaixe da grade. */
  pontoNoChao(clientX: number, clientY: number): Ponto3 | null
  /** Volume medido do GLB já carregado, sem expor objetos do Three ao host. */
  volumeDoModelo(id: string): VolumeDeComposicao | null
  /** Ausente enquanto os bytes do relevo não estão prontos; não substitui altura por zero. */
  fonteDeAlturas(): FonteDeAlturas | undefined
  /** Enquadra os objetos dados, ou o cenário inteiro. */
  enquadrar(ids?: readonly string[]): void
  /** Uma foto do palco agora, sem as alças de edição. */
  capturar(largura?: number): Promise<Blob | null>
  destruir(): void
}
