/** Forma serializada neutra compartilhada pelos codecs e pelo workspace Blockly. */
export interface SerializedBlocklyBlock {
  type: string
  id?: string
  x?: number
  y?: number
  /** Estado visual inicial; útil para projetos grandes abrirem sem renderizar árvores inteiras. */
  collapsed?: boolean
  fields?: Record<string, string | number>
  /** Soquete com um bloco real e/ou a sombra substituível do Blockly. */
  inputs?: Record<string, { block?: SerializedBlocklyBlock; shadow?: SerializedBlocklyBlock }>
  next?: { block: SerializedBlocklyBlock }
  /** Estado extra de mutators, como contagens e nomes de parâmetros. */
  extraState?: unknown
  /** Dados de round-trip que nenhum campo visual representa. */
  data?: string
}
