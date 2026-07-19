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
  conflictsWith: ['game-2d-advanced'],
  // Os Kits de Jogo são FACILITADORES p/ quem começa → 2D já no INICIANTE 2D (o
  // 3D entra no iniciante-3d; o "na unha"/manual fica avançado). Divulgação progressiva.
  minLevel: 'iniciante-2d',
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
