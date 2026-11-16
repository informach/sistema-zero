import type {
  ComandoDeCenario,
  DocumentoDeCenario,
  ModeloDeCatalogo,
  ProjetoDeCenario,
  RevisaoDeCenario,
} from '@sistemazero/molda-cenarios-core'
import type {
  CenarioRuntimeMontagem,
  CenarioRuntimePort,
} from '@sistemazero/molda-cenarios-core/runtime'
import type { CenariosController } from './controller'

export type {
  CenarioRuntimeMontagem,
  CenarioRuntimePort,
  EstadoDeViewport,
  FerramentaDeCenario,
} from '@sistemazero/molda-cenarios-core/runtime'

export interface CenariosHostAdapter {
  ligarSessao?(editor: CenariosController, runtime: () => CenarioRuntimePort | null): () => void
  tema: 'light' | 'dark'
  listar(): Promise<ProjetoDeCenario[]>
  abrir(id: string): Promise<RevisaoDeCenario>
  criar(nome: string, documento: DocumentoDeCenario, operacaoId: string): Promise<RevisaoDeCenario>
  editar(
    id: string,
    revisaoEsperada: number,
    comandos: ComandoDeCenario[],
    operacaoId: string,
  ): Promise<RevisaoDeCenario>
  restaurar(
    id: string,
    revisaoEsperada: number,
    origem: number,
    operacaoId: string,
  ): Promise<RevisaoDeCenario>
  catalogo(referencia: { id: string; digest: string }): Promise<ModeloDeCatalogo[]>
  aplicar(id: string, revisao: number): Promise<void>
  runtime: CenarioRuntimeMontagem
  miniatura(modelo: ModeloDeCatalogo, sinal: AbortSignal): Promise<Blob | null>
  urlDaArte(modelo: ModeloDeCatalogo): string
  recuperar(id: string): Promise<{ base: number; documento: DocumentoDeCenario } | null>
  guardarRecuperacao(
    id: string,
    valor: { base: number; documento: DocumentoDeCenario } | null,
  ): Promise<void>
}
