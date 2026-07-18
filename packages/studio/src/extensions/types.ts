import type { BlockLevel, ProjectAsset } from '#core'
import type { SZIR } from '#ir'

export type ExtensionPermission = 'canvas' | 'keyboard' | 'mouse' | 'audio' | 'storage' | 'network'

/**
 * Default do `minLevel` de extensão SEM classificação: `intermediario-3d` — o
 * degrau em que o legado `intermediario` normaliza. Preserva "aparecia quando o
 * intermediário antigo aparecia" para perfis legados e é CONSERVADOR para os
 * degraus novos (extensão nova não vaza p/ Inventor/Explorador sem opt-in).
 */
export const DEFAULT_EXTENSION_MIN_LEVEL: BlockLevel = 'intermediario-3d'

/** Degrau mínimo efetivo de uma extensão (fonte única — não use `?? '…'` inline). */
export function extensionMinLevel(ext: Pick<ExtensionDefinition, 'minLevel'>): BlockLevel {
  return ext.minLevel ?? DEFAULT_EXTENSION_MIN_LEVEL
}

export interface ExtensionManifest {
  /** Identificador único (kebab-case). Ex.: 'game-2d'. */
  id: string
  name: string
  version: string
  description: string
  category: string
  /** Sempre true; o catálogo do Sistema Zero só aceita extensões oficiais. */
  official: true
  /** Não-oficiais nunca aparecem; este flag é apenas auto-documentação. */
  enabledByDefault: boolean
  permissions: ExtensionPermission[]
  /**
   * Documentação em markdown para o usuário final — NÃO é o prompt da IA. O
   * contexto da IA vive em `ExtensionDefinition.ai.promptContext`.
   */
  docs: string
  examples: ExtensionExample[]
}

export interface ExtensionExample {
  name: string
  description?: string
  ir: SZIR
  /**
   * Assets embutidos que o exemplo precisa (ex.: um sprite pequeno do inimigo). Como
   * os assets de jogos reais são pesados, use SÓ imagens minúsculas geradas (ver o
   * `invadersStarfieldPng` do exemplo clássico). Vazio/ausente = exemplo sem asset.
   */
  assets?: ProjectAsset[]
}

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

/**
 * Definição completa de uma extensão oficial — bundlada estaticamente.
 */
export interface ExtensionDefinition {
  manifest: ExtensionManifest
  /**
   * Degrau mínimo de aprendizado para a categoria da extensão aparecer na paleta
   * (divulgação progressiva). Ausente ⇒ `DEFAULT_EXTENSION_MIN_LEVEL`. Use
   * `extensionMinLevel(ext)` nos call sites (nunca `?? '…'` inline).
   */
  minLevel?: BlockLevel
  blockly: {
    /** Block JSON definitions (compatíveis com defineBlocksWithJsonArray). */
    // biome-ignore lint/suspicious/noExplicitAny: o formato Blockly é livre por design
    blocks: any[]
    toolboxCategory: ExtensionToolboxCategory
  }
  runtime: {
    /** Script injetado no <head> do iframe — expõe API global (ex.: window.SZGame2D). */
    bootstrapScript: string
    /**
     * Módulos ESM que a extensão precisa no preview, como mapa
     * `specifier → URL` adicionado ao importmap do iframe (ex.:
     * `{ three: 'https://esm.sh/three@0.180.0' }`). A URL é FIXADA (pinada) e a
     * CSP libera SÓ essa origem em `script-src` — não é vetor de exfiltração
     * (carregamento de lib de mão única). Use só com a permission `network`.
     */
    esmImports?: Record<string, string>
  }
  ai?: {
    /** Contexto rico para futuras integrações de IA. */
    promptContext: string
  }
}
