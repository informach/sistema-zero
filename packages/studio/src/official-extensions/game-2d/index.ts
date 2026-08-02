import type { ExtensionDefinition } from '#extensions'
import { defineExtensionExamples, GAME_2D_LIFECYCLE, validateManifest } from '#extensions'
import { fullscreenConflictsFor } from '../fullscreenConflicts'
import { gameTwoDPromptSummary } from './aiSummary'
import { gameTwoDBlocks, gameTwoDToolboxCategory } from './blocks'
import { gameTwoDManifest } from './manifest'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO se
// alguém quebrar o contrato.
validateManifest(gameTwoDManifest)

export const gameTwoDExtension: ExtensionDefinition = {
  manifest: gameTwoDManifest,
  examples: defineExtensionExamples(
    31,
    async () => (await import('./exampleCatalog')).gameTwoDExamples,
  ),
  conflictsWith: fullscreenConflictsFor('game-2d'),
  // Os Kits de Jogo são FACILITADORES p/ quem começa → 2D já no INICIANTE 2D (o
  // 3D entra no iniciante-3d; o "na unha"/manual fica avançado). A extensão
  // continua oferecendo a paleta completa; a aula escolhe quais blocos apresentar.
  minLevel: 'iniciante-2d',
  blockly: {
    blocks: gameTwoDBlocks,
    toolboxCategory: gameTwoDToolboxCategory,
  },
  runtime: {
    loadBootstrapScript: async () => (await import('./runtime')).gameTwoDRuntime,
    lifecycle: GAME_2D_LIFECYCLE,
  },
  ai: {
    promptSummary: gameTwoDPromptSummary,
    loadPromptContext: async () => (await import('./ai')).gameTwoDPromptContext,
  },
}

export {
  GAME_TWO_D_API_KEYS,
  type GameTwoDApiKey,
  type GameTwoDLifecycleApi,
  type GameTwoDRuntimeApi,
} from './runtimeContract'
export { gameTwoDBlocks, gameTwoDManifest, gameTwoDToolboxCategory }
