import type { ExtensionDefinition } from '#extensions'
import { validateManifest } from '#extensions'
import { gameThreeDPromptContext } from './ai'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from './blocks'
import { gameThreeDManifest } from './manifest'
import { gameThreeDRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(gameThreeDManifest)

/** Versão fixada do Three.js (CDN ESM). Atualizar com cuidado (testar a cena). */
const THREE_CDN = 'https://esm.sh/three@0.180.0'

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
    promptContext: gameThreeDPromptContext,
  },
}

export { gameThreeDBlocks, gameThreeDManifest, gameThreeDRuntime, gameThreeDToolboxCategory }
