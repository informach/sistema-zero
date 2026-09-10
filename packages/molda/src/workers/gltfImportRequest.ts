import { GLTF_INPUT_LIMITS, GltfInputError } from '../import/gltfInput'
import type { GltfNativeIdentity, GltfNativeOptions } from '../import/gltfNativeDocument'
import { gltfLocalFilePath } from '../import/gltfResourcePath'
import type { GltfLocalFile } from '../import/gltfResourcePlan'
import * as v from '../scene/validation'
import {
  type NativeImportToken,
  readNativeImportFiles,
  readNativeImportIdentity,
  readNativeImportToken,
} from './nativeImportRequest'

/** Includes EVERY selected companion, not only dependencies discovered after cloning. */
export const MAX_GLTF_IMPORT_WIRE_BYTES = GLTF_INPUT_LIMITS.selectedFileBytes
export type GltfImportToken = NativeImportToken
export interface GltfImportRequest extends GltfImportToken {
  bytes: Uint8Array
  files: readonly GltfLocalFile[]
  entryPath: string
  sceneIndex: number | null | 'inspect'
  identity: GltfNativeIdentity
  options: GltfNativeOptions
}

export const readGltfImportToken = readNativeImportToken

/** Metadata + aggregate preflight first; the optional snapshot owns only the chosen byte ranges. */
export function readGltfImportRequest(raw: unknown, snapshot = false): GltfImportRequest {
  const row = v.record(raw, 'request', [
      'documentId',
      'revision',
      'requestId',
      'bytes',
      'files',
      'entryPath',
      'sceneIndex',
      'identity',
      'options',
    ]),
    token = readGltfImportToken(row),
    identity = readNativeImportIdentity(row.identity, token.documentId),
    settings = v.record(row.options, 'options', ['skinWeights', 'animations']),
    animation = v.record(
      settings.animations === undefined ? {} : settings.animations,
      'options.animations',
      ['fps', 'loop', 'cubic', 'rotations', 'morphs', 'unresolved'],
    ),
    options: GltfNativeOptions = {
      skinWeights: v.choice(
        settings.skinWeights === undefined ? 'preserve' : settings.skinWeights,
        ['preserve', 'normalize'],
        'options.skinWeights',
      ),
      animations: {
        fps: v.number(
          animation.fps === undefined ? 30 : animation.fps,
          'options.animations.fps',
          1,
          120,
          true,
        ),
        loop: v.boolean(
          animation.loop === undefined ? false : animation.loop,
          'options.animations.loop',
        ),
        cubic: v.choice(
          animation.cubic === undefined ? 'reject' : animation.cubic,
          ['reject', 'bake'],
          'options.animations.cubic',
        ),
        rotations: v.choice(
          animation.rotations === undefined ? 'preserve' : animation.rotations,
          ['preserve', 'normalize'],
          'options.animations.rotations',
        ),
        morphs: v.choice(
          animation.morphs === undefined ? 'reject' : animation.morphs,
          ['reject', 'omit'],
          'options.animations.morphs',
        ),
        unresolved: v.choice(
          animation.unresolved === undefined ? 'reject' : animation.unresolved,
          ['reject', 'omit'],
          'options.animations.unresolved',
        ),
      },
    },
    entryPath = gltfLocalFilePath(
      v.text(row.entryPath, 'entryPath', GLTF_INPUT_LIMITS.pathLength),
      'entryPath',
    ),
    sceneIndex =
      row.sceneIndex === null || row.sceneIndex === 'inspect'
        ? row.sceneIndex
        : v.number(row.sceneIndex, 'sceneIndex', 0, GLTF_INPUT_LIMITS.scenes - 1, true)
  return {
    ...token,
    identity,
    options,
    entryPath,
    sceneIndex,
    ...readNativeImportFiles(
      row.bytes,
      row.files,
      {
        fileBytes: GLTF_INPUT_LIMITS.fileBytes,
        totalBytes: MAX_GLTF_IMPORT_WIRE_BYTES,
        files: GLTF_INPUT_LIMITS.resources,
        pathChars: GLTF_INPUT_LIMITS.pathLength,
        path: gltfLocalFilePath,
        budgetError: (path) =>
          new GltfInputError(
            'budget',
            path,
            'Os arquivos escolhidos ultrapassam o orçamento de transporte.',
          ),
      },
      snapshot,
    ),
  }
}
