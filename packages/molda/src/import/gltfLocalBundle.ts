import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { gltfLocalFilePath } from './gltfResourcePath'
import type { GltfLocalFile } from './gltfResourcePlan'
import {
  type LocalImportBundle,
  type LocalImportChosenFile,
  readLocalImportBundle,
} from './localImportBundle'

export type GltfChosenFile = LocalImportChosenFile
export type GltfLocalBundle = LocalImportBundle

/** Validate ALL metadata before any read. Native file IO may finish after abort; its result is discarded. */
export async function readGltfLocalBundle(
  chosen: readonly GltfChosenFile[],
  signal: AbortSignal,
  previous: readonly GltfLocalFile[] = [],
): Promise<GltfLocalBundle> {
  return readLocalImportBundle(chosen, signal, previous, {
    ...GLTF_INPUT_LIMITS,
    path: gltfLocalFilePath,
    entry: (path) => /\.(glb|gltf)$/i.test(path),
    error: (reason, path, message) => new GltfInputError(reason, path, message),
  })
}
