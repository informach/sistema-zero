import type { ExtensionDefinition } from '#extensions'
import { defineExtensionExamples, GAME_3D_LIFECYCLE, validateManifest } from '#extensions'
import { THREE_CDN } from '../../preview/coreImports'
import { fullscreenConflictsFor } from '../fullscreenConflicts'
import { gameThreeDPromptSummary } from './aiSummary'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from './blocks'
import { gameThreeDManifest } from './manifest'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(gameThreeDManifest)

export const gameThreeDExtension: ExtensionDefinition = {
  manifest: gameThreeDManifest,
  examples: defineExtensionExamples(
    18,
    async () => (await import('./exampleCatalog')).gameThreeDExamples,
  ),
  conflictsWith: fullscreenConflictsFor('game-3d'),
  // Kit facilitador de jogo 3D → é a PORTA DE ENTRADA do 3D (iniciante-3d, o
  // degrau logo após o Inventor na carreira); o "na unha"/manual fica avançado-3d.
  minLevel: 'iniciante-3d',
  blockly: {
    blocks: gameThreeDBlocks,
    toolboxCategory: gameThreeDToolboxCategory,
  },
  runtime: {
    loadBootstrapScript: async () => (await import('./runtime')).gameThreeDRuntime,
    lifecycle: GAME_3D_LIFECYCLE,
    esmImports: { three: THREE_CDN },
  },
  ai: {
    promptSummary: gameThreeDPromptSummary,
    loadPromptContext: async () => (await import('./ai')).gameThreeDPromptContext,
  },
}

export { gameThreeDBlocks, gameThreeDManifest, gameThreeDToolboxCategory }
