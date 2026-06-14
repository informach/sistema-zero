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
  // 3D só aparece na paleta a partir do nível avançado (divulgação progressiva).
  minLevel: 'avancado',
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
