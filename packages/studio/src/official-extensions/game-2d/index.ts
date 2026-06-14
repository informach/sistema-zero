import type { ExtensionDefinition } from '#extensions'
import { validateManifest } from '#extensions'
import { gameTwoDPromptContext } from './ai'
import { gameTwoDBlocks, gameTwoDToolboxCategory } from './blocks'
import { gameTwoDManifest } from './manifest'
import { gameTwoDRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO se
// alguém quebrar o contrato.
validateManifest(gameTwoDManifest)

export const gameTwoDExtension: ExtensionDefinition = {
  manifest: gameTwoDManifest,
  // Extensões nunca aparecem na paleta do INICIANTE: 2D entra no intermediário
  // (3D no avançado). Divulgação progressiva.
  minLevel: 'intermediario',
  blockly: {
    blocks: gameTwoDBlocks,
    toolboxCategory: gameTwoDToolboxCategory,
  },
  runtime: {
    bootstrapScript: gameTwoDRuntime,
  },
  ai: {
    promptContext: gameTwoDPromptContext,
  },
}

export { gameTwoDBlocks, gameTwoDManifest, gameTwoDRuntime, gameTwoDToolboxCategory }
