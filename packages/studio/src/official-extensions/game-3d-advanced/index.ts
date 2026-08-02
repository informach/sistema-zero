import type { ExtensionDefinition } from '#extensions'
import { defineExtensionExamples, GAME_3D_ADVANCED_LIFECYCLE, validateManifest } from '#extensions'
import { THREE_CDN } from '../../three/threeRuntimeContract'
import { fullscreenConflictsFor } from '../fullscreenConflicts'
import { gameKit3DPromptContext } from './ai'
import { gameKit3DBlocks, gameKit3DToolboxCategory } from './blocks'
import { gameKit3DManifest } from './manifest'

// Valida o manifest em tempo de inicialização do módulo — falha CEDO.
validateManifest(gameKit3DManifest)

/** Versão fixada do Three.js (CDN ESM) — a MESMA do game-3d, para o importmap
 * colapsar numa entrada só se as duas extensões coexistirem. */
/**
 * Loaders de modelo (GLB) e de céu (HDR). São ADDONS do three, e o kit foi
 * escrito com a regra "sem addons" por medo de o esm.sh embutir uma 2ª cópia do
 * three (instanceof quebraria). **Medido em browser real (spike 14/07): a regra
 * era falsa** — o addon dedupa, e `gltf.scene instanceof THREE.Object3D` dá true
 * com e sem `?external=three`. Mantemos o `?external=three` mesmo assim: ele faz
 * o addon importar `three` BARE, resolvido pelo NOSSO importmap, em vez de
 * depender de uma URL interna do esm.sh que pode mudar.
 *
 * ⚠️ O `script-src` da CSP sai da ORIGEM (`extensionImportOrigins`), e esm.sh já
 * está liberado pelo three → estas entradas não pedem mudança de CSP.
 * ⚠️ A rede é MORTA no preview (`permissionGuard` mata o fetch, `connect-src
 * 'none'`), então `loader.load(url)` NUNCA funciona — o runtime usa
 * `loader.parse(arrayBuffer, ...)`, que não faz I/O nenhum.
 * ⚠️ KTX2/Draco ficam de fora: transcoder WASM + Workers, ambos barrados.
 */
const GLTF_LOADER_CDN = `${THREE_CDN}/examples/jsm/loaders/GLTFLoader.js?external=three`
const HDR_LOADER_CDN = `${THREE_CDN}/examples/jsm/loaders/HDRLoader.js?external=three`
// SkeletonUtils.clone REAMARRA o esqueleto do clone aos ossos dele — o clone comum
// do Object3D deixa o boneco preso ao esqueleto do original. É a mesma troca que o
// curso fez ao passar a animar personagens.
const SKELETON_UTILS_CDN = `${THREE_CDN}/examples/jsm/utils/SkeletonUtils.js?external=three`

export const gameKit3DExtension: ExtensionDefinition = {
  manifest: gameKit3DManifest,
  examples: defineExtensionExamples(
    17,
    async () => (await import('./exampleCatalog')).gameKit3DExamples,
  ),
  conflictsWith: fullscreenConflictsFor('game-3d-advanced'),
  // Reclassificado p/ INTERMEDIÁRIO 3D (26/07/2026): o kit passa a abrir no Arquiteto
  // de Mundos (junto do Mundo 3D), não só na Lenda. Continua sendo base de engine
  // (FSM/pooling/grade), mas gated pela carreira (só chega ao Arquiteto quem subiu 6
  // níveis). O piso por prefixo sz_g3k_ (em blockLevels.ts) acompanha este minLevel.
  minLevel: 'intermediario-3d',
  blockly: {
    blocks: gameKit3DBlocks,
    toolboxCategory: gameKit3DToolboxCategory,
  },
  runtime: {
    loadBootstrapScript: async () => (await import('./runtime')).gameKit3DRuntime,
    lifecycle: GAME_3D_ADVANCED_LIFECYCLE,
    esmImports: {
      three: THREE_CDN,
      'three/addons/loaders/GLTFLoader.js': GLTF_LOADER_CDN,
      'three/addons/loaders/HDRLoader.js': HDR_LOADER_CDN,
      'three/addons/utils/SkeletonUtils.js': SKELETON_UTILS_CDN,
    },
  },
  ai: {
    promptContext: gameKit3DPromptContext,
  },
}

export { gameKit3DBlocks, gameKit3DManifest, gameKit3DToolboxCategory }
