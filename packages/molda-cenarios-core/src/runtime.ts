import type { ModeloDeCatalogo } from './catalogo'
import type { ComandoDeCenario } from './comandos'
import type { DocumentoDeCenario } from './documento'

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
  atualizar(documento: DocumentoDeCenario, estado: EstadoDeViewport, revisao: number): Promise<void>
  enquadrar(ids?: readonly string[]): void
  testar(iniciar: boolean): Promise<void>
  capturar(revisaoEsperada?: number): Promise<Blob>
  estado(): { revisao: number; revisaoPronta: number; modo: 'editando' | 'testando' }
  colocar(modeloId: string, x: number, y: number): Promise<void>
  desmontar(): void
}
export interface CenarioRuntimeMontagem {
  montar(
    elemento: HTMLElement,
    opcoes: {
      documento: DocumentoDeCenario
      revisao: number
      catalogo: readonly ModeloDeCatalogo[]
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
