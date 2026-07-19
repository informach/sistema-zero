import type { ExtensionDefinition } from '#extensions'
import { validateManifest } from '#extensions'
import { gameTwoDPromptSummary } from './aiSummary'
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
  // 3D entra no iniciante-3d; o "na unha"/manual fica avançado). A extensão
  // continua oferecendo a paleta completa; a aula escolhe quais blocos apresentar.
  minLevel: 'iniciante-2d',
  blockly: {
    blocks: gameTwoDBlocks,
    toolboxCategory: gameTwoDToolboxCategory,
  },
  runtime: {
    bootstrapScript: gameTwoDRuntime,
  },
  ai: {
    promptSummary: gameTwoDPromptSummary,
    loadPromptContext: async () => (await import('./ai')).gameTwoDPromptContext,
  },
}

export type { GameTwoDLifecycleApi } from './runtimeContract'
export { gameTwoDBlocks, gameTwoDManifest, gameTwoDRuntime, gameTwoDToolboxCategory }
