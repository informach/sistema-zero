import type { ExtensionDefinition } from '#extensions'
import { validateManifest } from '#extensions'
import { world3DPromptContext } from './ai'
import { world3DBlocks, world3DToolboxCategory } from './blocks'
import { world3DManifest } from './manifest'
import { world3DRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(world3DManifest)

/** Versão fixada do Three.js (CDN ESM) — a MESMA do game-3d/game-3d-advanced e
 * do Canvas 3D do núcleo (coreImports.THREE_CDN), para o importmap colapsar
 * numa entrada só se coexistirem no mesmo projeto. */
const THREE_CDN = 'https://esm.sh/three@0.180.0'

export const worldThreeDExtension: ExtensionDefinition = {
  manifest: world3DManifest,
  // Decisão de produto: diferente do Jogo 3D Avançado (base de engine, tudo
  // 'avancado'), o Mundo 3D é a extensão dos blocos "mágicos" de alto nível —
  // 1 bloco = 1 resultado. Piso por prefixo sz_w3d_ em blockLevels.ts.
  minLevel: 'intermediario',
  blockly: {
    blocks: world3DBlocks,
    toolboxCategory: world3DToolboxCategory,
  },
  runtime: {
    bootstrapScript: world3DRuntime,
    esmImports: {
      three: THREE_CDN,
      // GLTFLoader entra quando o "Espalhar cópias do modelo .glb" chegar
      // (mesmo padrão ?external=three do game-3d-advanced).
    },
  },
  ai: {
    promptContext: world3DPromptContext,
  },
}

export { world3DBlocks, world3DManifest, world3DRuntime, world3DToolboxCategory }
