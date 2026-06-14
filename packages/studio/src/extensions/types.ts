import type { BlockLevel } from '#core'
import type { SZIR } from '#ir'

export type ExtensionPermission = 'canvas' | 'keyboard' | 'mouse' | 'audio' | 'storage' | 'network'

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
}

/**
 * Toolbox category contract — equivalente ao formato Blockly mas tipado.
 */
export interface ExtensionToolboxCategory {
  kind: 'category'
  name: string
  colour: string
  contents: Array<{ kind: 'block'; type: string }>
}

/**
 * Definição completa de uma extensão oficial — bundlada estaticamente.
 */
export interface ExtensionDefinition {
  manifest: ExtensionManifest
  /**
   * Nível mínimo de aprendizado para a categoria da extensão aparecer na paleta
   * (divulgação progressiva). Ausente ⇒ visível em qualquer nível. Ex.: game-3d
   * usa 'avancado' para não poluir a paleta do iniciante.
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
