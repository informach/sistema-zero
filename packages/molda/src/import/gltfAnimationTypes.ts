import type { GltfAccessor } from './gltfAccessors'
import type { GltfGraph } from './gltfGraph'
import type { GltfMeshViewUses } from './gltfMeshAttributes'
import type { GltfMesh } from './gltfMeshes'
import type { GltfSkin } from './gltfSkins'

export type GltfInterpolation = 'LINEAR' | 'STEP' | 'CUBICSPLINE'
export type GltfAnimationPath = 'translation' | 'rotation' | 'scale' | 'weights'
export type GltfAnimationTarget =
  | { kind: 'node'; node: number; path: GltfAnimationPath }
  | { kind: 'unresolved'; node: number | null; path: string }

export interface GltfAnimationSampler {
  input: number
  output: number
  interpolation: GltfInterpolation
}
export interface GltfAnimation {
  name: string | null
  samplers: GltfAnimationSampler[]
  channels: { sampler: number; target: GltfAnimationTarget }[]
}
/** These sources have already passed their respective glTF readers. */
export interface GltfAnimationSources {
  graph: GltfGraph
  meshes: readonly GltfMesh[]
  skins: readonly GltfSkin[]
  accessors: readonly GltfAccessor[]
  meshUses: GltfMeshViewUses
}
