import type { ExtensionDefinition } from '#extensions'
import { validateManifest } from '#extensions'
import { gameKit3DPromptContext } from './ai'
import { gameKit3DBlocks, gameKit3DToolboxCategory } from './blocks'
import { gameKit3DManifest } from './manifest'
import { gameKit3DRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(gameKit3DManifest)

/** Versão fixada do Three.js (CDN ESM) — a MESMA do game-3d, para o importmap
 * colapsar numa entrada só se as duas extensões coexistirem. */
const THREE_CDN = 'https://esm.sh/three@0.180.0'

export const gameKit3DExtension: ExtensionDefinition = {
  manifest: gameKit3DManifest,
  // Decisão de produto (14/07/2026): TODOS os blocos são nível AVANÇADO — é a
  // base de engine profissional (FSM por entidade, pooling, grade espacial).
  // O piso por prefixo sz_g3k_ vive em blockLevels.ts.
  minLevel: 'avancado',
  blockly: {
    blocks: gameKit3DBlocks,
    toolboxCategory: gameKit3DToolboxCategory,
  },
  runtime: {
    bootstrapScript: gameKit3DRuntime,
    esmImports: { three: THREE_CDN },
  },
  ai: {
    promptContext: gameKit3DPromptContext,
  },
}

export { gameKit3DBlocks, gameKit3DManifest, gameKit3DRuntime, gameKit3DToolboxCategory }
