import type { ModeloDeCatalogo } from './catalogo'
import type { ComandoDeCenario } from './comandos'
import type { DocumentoDeCenario, Transformacao } from './documento'

/** Contrato de montagem por URL. Não importa a interface nem o código do jogo. */
export type FerramentaDeCenario =
  | 'selecionar'
  | 'mover'
  | 'girar'
  | 'escala'
  | 'terreno'
  | 'caminho'
  | 'agua'
export interface EstadoDeViewport {
  selecionados: string[]
  ferramenta: FerramentaDeCenario
  vista: 'perspectiva' | 'superior'
  encaixe: boolean
  inspecao: boolean
  pincel: {
    tipo: 'elevar' | 'aplainar' | 'suavizar'
    raio: number
    valor: number
    intensidade: number
  }
}
export interface CenarioRuntimePort {
  transformacoes?(ids: readonly string[]): Record<string, Transformacao>
  posicionarCamera?(
    posicao: { x: number; y: number; z: number },
    alvo: { x: number; y: number; z: number },
  ): void
  atualizar(documento: DocumentoDeCenario, estado: EstadoDeViewport, revisao: number): Promise<void>
  enquadrar(ids?: readonly string[]): void
  testar(iniciar: boolean): Promise<void>
  capturar(revisaoEsperada?: number): Promise<Blob>
  estado(): {
    revisao: number
    revisaoPronta: number
    modo: 'editando' | 'testando'
    avatar?: { x: number; y: number; z: number }
    nadando?: boolean
  }
  colocar(modeloId: string, x: number, y: number): Promise<void>
  desmontar(): void
}
export interface CenarioRuntimeMontagem {
  miniatura?(modelo: ModeloDeCatalogo, url: string, sinal: AbortSignal): Promise<Blob>
  liberarMiniaturas?(): void
  montar(
    elemento: HTMLElement,
    opcoes: {
      documento: DocumentoDeCenario
      revisao: number
      catalogo: readonly ModeloDeCatalogo[]
      urlDaArte: (modelo: ModeloDeCatalogo) => string
      estado: EstadoDeViewport
      aoSelecionar: (ids: string[]) => void
      aoGesto: (ativo: boolean) => void
      aoEditar: (comandos: ComandoDeCenario[]) => Promise<void>
      aoMedir: (medidas: {
        chamadas: number
        triangulos: number
        geometrias: number
        texturas: number
        fps: number
      }) => void
    },
  ): Promise<CenarioRuntimePort>
}
