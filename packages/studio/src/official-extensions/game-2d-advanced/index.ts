import type { ExtensionDefinition } from '#extensions'
import { GAME_2D_ADVANCED_LIFECYCLE, validateManifest } from '#extensions'
import { fullscreenConflictsFor } from '../fullscreenConflicts'
import { gameKitPromptSummary } from './aiSummary'
import { gameKitBlocks, gameKitToolboxCategory } from './blocks'
import { gameKitManifest } from './manifest'
import { gameKitRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO se
// alguém quebrar o contrato.
validateManifest(gameKitManifest)

export const gameKitExtension: ExtensionDefinition = {
  manifest: gameKitManifest,
  conflictsWith: fullscreenConflictsFor('game-2d-advanced'),
  // A extensão começa no Intermediário 2D com o caminho feliz e os kits de
  // gênero. Peças internas de motor (pooling, física manual, grades, pilhas e
  // interpolação genérica) sobem individualmente ao Avançado 2D em blockLevels.
  minLevel: 'intermediario-2d',
  blockly: {
    blocks: gameKitBlocks,
    toolboxCategory: gameKitToolboxCategory,
  },
  runtime: {
    bootstrapScript: gameKitRuntime,
    lifecycle: GAME_2D_ADVANCED_LIFECYCLE,
  },
  ai: {
    promptSummary: gameKitPromptSummary,
    loadPromptContext: async () => (await import('./ai')).gameKitPromptContext,
  },
}

export { gameKitBlocks, gameKitManifest, gameKitRuntime, gameKitToolboxCategory }
