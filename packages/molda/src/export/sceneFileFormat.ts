import { MAX_SCENE_GLB_BYTES } from './GlbBinary'

export type SceneFileFormat = 'glb' | 'gltf' | 'obj'
export const SCENE_FILE_TYPES = {
  glb: { extension: 'glb', mime: 'model/gltf-binary' },
  gltf: { extension: 'gltf', mime: 'model/gltf+json' },
  obj: { extension: 'obj.zip', mime: 'application/zip' },
} as const
export const MAX_SCENE_FILE_BYTES = MAX_SCENE_GLB_BYTES * 2
