import type { ExtensionDefinition } from '#extensions'
import { defineExtensionExamples, GAME_3D_LIFECYCLE, validateManifest } from '#extensions'
import { THREE_CDN } from '../../preview/coreImports'
import { fullscreenConflictsFor } from '../fullscreenConflicts'
import { gameThreeDPromptSummary } from './aiSummary'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from './blocks'
import { gameThreeDManifest } from './manifest'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(gameThreeDManifest)

/** Os addons do three no MESMO esm.sh pinado (espelho do `game-3d-advanced/index.ts`). */
const GLTF_LOADER_CDN = `${THREE_CDN}/examples/jsm/loaders/GLTFLoader.js?external=three`
const HDR_LOADER_CDN = `${THREE_CDN}/examples/jsm/loaders/HDRLoader.js?external=three`

export const gameThreeDExtension: ExtensionDefinition = {
  manifest: gameThreeDManifest,
  examples: defineExtensionExamples(
    19,
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
    // Os dois addons entram para "Criar o objeto … com o modelo" (.glb) e "Usar o céu
    // 360°" (.hdr) — as MESMAS URLs pinadas do Jogo 3D Avançado (mesma origem do
    // `three`: nada novo na CSP). `?external=three` faz o addon importar `three` BARE,
    // resolvido pelo nosso importmap, em vez de uma segunda cópia do three.
    esmImports: {
      three: THREE_CDN,
      'three/addons/loaders/GLTFLoader.js': GLTF_LOADER_CDN,
      'three/addons/loaders/HDRLoader.js': HDR_LOADER_CDN,
    },
  },
  ai: {
    promptSummary: gameThreeDPromptSummary,
    loadPromptContext: async () => (await import('./ai')).gameThreeDPromptContext,
  },
}

export { gameThreeDBlocks, gameThreeDManifest, gameThreeDToolboxCategory }
