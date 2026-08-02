import type { ExtensionDefinition } from '#extensions'
import { defineExtensionExamples, validateManifest, WORLD_3D_LIFECYCLE } from '#extensions'
import { THREE_CDN } from '../../three/threeRuntimeContract'
import { fullscreenConflictsFor } from '../fullscreenConflicts'
import { world3DPromptContext } from './ai'
import { world3DBlocks, world3DToolboxCategory } from './blocks'
import { world3DManifest } from './manifest'
import { world3DRuntime } from './runtime'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(world3DManifest)

/** Versão fixada do Three.js (CDN ESM) — a MESMA do game-3d/game-3d-advanced e
 * do Canvas 3D do núcleo (coreImports.THREE_CDN), para o importmap colapsar
 * numa entrada só se coexistirem no mesmo projeto. */
/**
 * Loader de modelo (GLB) para o "Espalhar/Pôr o modelo". `?external=three` faz
 * o addon importar `three` BARE, resolvido pelo NOSSO importmap (medido no spike
 * da g3k 14/07: dedupa com e sem, mas o external não depende de URL interna do
 * esm.sh). A rede é MORTA no preview → o runtime usa `loader.parse(arrayBuffer)`.
 */
const GLTF_LOADER_CDN = `${THREE_CDN}/examples/jsm/loaders/GLTFLoader.js?external=three`
const HDR_LOADER_CDN = `${THREE_CDN}/examples/jsm/loaders/HDRLoader.js?external=three`

export const worldThreeDExtension: ExtensionDefinition = {
  manifest: world3DManifest,
  examples: defineExtensionExamples(13, async () => (await import('./examples')).world3DExamples),
  conflictsWith: fullscreenConflictsFor('world-3d'),
  // O Mundo 3D e o Jogo 3D Avançado abrem no intermediário 3D (26/07), um degrau
  // acima da entrada do 3D: o Mundo oferece blocos "mágicos" de alto nível (1 bloco
  // = 1 resultado), enquanto o kit avançado oferece uma base de engine. O piso por
  // prefixo sz_w3d_ em blockLevels.ts acompanha este minLevel.
  minLevel: 'intermediario-3d',
  blockly: {
    blocks: world3DBlocks,
    toolboxCategory: world3DToolboxCategory,
  },
  runtime: {
    bootstrapScript: world3DRuntime,
    lifecycle: WORLD_3D_LIFECYCLE,
    esmImports: {
      three: THREE_CDN,
      'three/addons/loaders/GLTFLoader.js': GLTF_LOADER_CDN,
      'three/addons/loaders/HDRLoader.js': HDR_LOADER_CDN,
    },
  },
  ai: {
    promptContext: world3DPromptContext,
  },
}

export { world3DBlocks, world3DManifest, world3DRuntime, world3DToolboxCategory }
