import type {
  DocumentoDeCenario,
  EstadoDoTerreno,
  ParametrosDeTerreno,
  RegioesDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'

export type ConfiguracaoDaEscultura = ParametrosDeTerreno & { pausa?: string }
export interface EstadoDaEscultura {
  ativo: boolean
  aguardando: boolean
  erro: string | null
}
export interface GestoDeTerreno {
  documentoDeOrigem: DocumentoDeCenario
  estado: EstadoDoTerreno
  regioes: RegioesDeTerreno
}
