import type { ExtensionDefinition } from '#extensions'
import { validateManifest } from '#extensions'
import { gameKitPromptContext } from './ai'
import { gameKitBlocks, gameKitToolboxCategory } from './blocks'
import { gameKitManifest } from './manifest'
import { gameKitRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO se
// alguém quebrar o contrato.
validateManifest(gameKitManifest)

export const gameKitExtension: ExtensionDefinition = {
  manifest: gameKitManifest,
  // Decisão de produto (14/07/2026): apesar do NOME "Avançado", todos os blocos
  // são nível INTERMEDIÁRIO 2D — a extensão é a ponte entre o Jogo 2D facilitado
  // e o jogo 100% em código. O piso por prefixo sz_gk_ vive em blockLevels.ts.
  minLevel: 'intermediario-2d',
  blockly: {
    blocks: gameKitBlocks,
    toolboxCategory: gameKitToolboxCategory,
  },
  runtime: {
    bootstrapScript: gameKitRuntime,
  },
  ai: {
    promptContext: gameKitPromptContext,
  },
}

export { gameKitBlocks, gameKitManifest, gameKitRuntime, gameKitToolboxCategory }
