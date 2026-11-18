export const DESTINOS_DE_EXPORTACAO = ['three', 'glb', 'raylib', 'studio', 'arquipelago'] as const
export type DestinoDeExportacao = (typeof DESTINOS_DE_EXPORTACAO)[number]

export interface ArquivoNoOrcamento {
  caminho: string
  bytes: number
  tipo: 'modelo' | 'recurso'
}
export interface EntradaDoOrcamento {
  /** Malhas efetivas após agrupar por material/região, não quantidade de objetos. */
  malhas: number
  arquivos: readonly ArquivoNoOrcamento[]
  bytesExistentes?: number
  malhasExistentes?: number
}
export interface ExcessoDoOrcamento {
  tipo: 'malhas' | 'modelo' | 'projeto' | 'pacote'
  atual: number
  limite: number
  arquivo?: string
}
export interface OrcamentoDaCena {
  destino: DestinoDeExportacao
  permitido: boolean
  bytes: number
  malhas: number
  excessos: ExcessoDoOrcamento[]
  /** Sugere avaliar o agrupamento; não promete resolver os demais limites. */
  sugerirJuncao: boolean
}
