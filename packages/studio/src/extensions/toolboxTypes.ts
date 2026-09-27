/**
 * Toolbox category contract — equivalente ao formato Blockly mas tipado. O
 * `contents` aceita blocos OU sub-categorias aninhadas (grupos coloridos por
 * domínio, à la Scratch/MakeCode — ex.: Jogo 2D → Sprites/Movimento/Quando…).
 */
/** Sombras pré-preenchidas dos slots `input_value` de um bloco da paleta, no formato
 * do toolbox do Blockly (ex.: { TITLE: { shadow: { type, fields } } }) — estrutura livre. */
// biome-ignore lint/suspicious/noExplicitAny: o formato de shadow do Blockly é livre.
export type ToolboxBlockInputs = Record<string, any>

export interface ExtensionToolboxCategory {
  kind: 'category'
  name: string
  colour: string
  contents: Array<
    { kind: 'block'; type: string; inputs?: ToolboxBlockInputs } | ExtensionToolboxCategory
  >
}
