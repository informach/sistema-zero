import type { ExtensionDefinition } from '#extensions'
import { validateManifest } from '#extensions'
import { THREE_CDN } from '../../preview/coreImports'
import { gameThreeDPromptSummary } from './aiSummary'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from './blocks'
import { gameThreeDManifest } from './manifest'
import { gameThreeDRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(gameThreeDManifest)

export const gameThreeDExtension: ExtensionDefinition = {
  manifest: gameThreeDManifest,
  // Kit facilitador de jogo 3D → é a PORTA DE ENTRADA do 3D (iniciante-3d, o
  // degrau logo após o Inventor na carreira); o "na unha"/manual fica avançado-3d.
  minLevel: 'iniciante-3d',
  blockly: {
    blocks: gameThreeDBlocks,
    toolboxCategory: gameThreeDToolboxCategory,
  },
  runtime: {
    bootstrapScript: gameThreeDRuntime,
    esmImports: { three: THREE_CDN },
  },
  ai: {
    promptSummary: gameThreeDPromptSummary,
    loadPromptContext: async () => (await import('./ai')).gameThreeDPromptContext,
  },
}

export { gameThreeDBlocks, gameThreeDManifest, gameThreeDRuntime, gameThreeDToolboxCategory }
