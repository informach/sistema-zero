import { newId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import { structuredBytes } from '../core/structuredBytes'
import { MAX_BACKUP_FILE_BYTES } from '../export/backupFormat'
import { sceneProjectName } from '../scene/createProject'
import type { MoldaSceneDocument } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import { readImportJson } from './importJson'

/** Wire expansion and metadata are bounded separately from the decoded authoring pixels. */
export const SCENE_PROJECT_FILE_LIMITS = {
  bytes: MAX_BACKUP_FILE_BYTES,
  jsonDepth: 128,
  jsonStructure: 16_000_000,
} as const

export type SceneProjectFileFailure = 'invalid' | 'version' | 'budget'
const messages = {
  invalid: 'Não consegui conferir esta cópia do Molda. O arquivo original não foi alterado.',
  version:
    'Esta cópia usa outra versão do Molda. Guarde o arquivo para abrir na versão correspondente.',
  budget:
    'Esta cópia é grande demais para abrir nesta oficina. O arquivo original não foi alterado.',
}
export class SceneProjectFileError extends Error {
  override readonly name = 'SceneProjectFileError'
  constructor(readonly reason: SceneProjectFileFailure) {
    super(messages[reason])
  }
}

export function checkSceneProjectFileSize(size: number): void {
  if (!Number.isSafeInteger(size) || size < 1) throw new SceneProjectFileError('invalid')
  if (size > SCENE_PROJECT_FILE_LIMITS.bytes) throw new SceneProjectFileError('budget')
}

/** Validate external native content without repair, migration or adopting its project identity. */
export function readSceneProjectContent(raw: unknown): MoldaSceneDocument {
  const read = readSceneDocument(raw)
  if (read.status === 'unsupported') throw new SceneProjectFileError('version')
  if (read.status === 'invalid') throw new SceneProjectFileError('invalid')
  if (structuredBytes(read.document) > MOLDA_LIMITS.maxGalleryBytes)
    throw new SceneProjectFileError('budget')
  return read.document
}

/** CPU work runs in the import worker. Caller retains its file; no scripts or resource IO. */
export function readSceneProjectFile(bytes: Uint8Array): MoldaSceneDocument {
  if (!(bytes instanceof Uint8Array) || !(bytes.buffer instanceof ArrayBuffer))
    throw new SceneProjectFileError('invalid')
  checkSceneProjectFileSize(bytes.byteLength)
  const raw = readImportJson(bytes, {
    ...SCENE_PROJECT_FILE_LIMITS,
    error: (reason) => new SceneProjectFileError(reason),
  })
  return readSceneProjectContent(raw)
}

/** Explicit restore creates independent data under a fresh CAS identity, never overwrites source. */
export function copySceneProject(source: MoldaSceneDocument, name: string): MoldaSceneDocument {
  const label = sceneProjectName(name),
    document = readSceneProjectContent(source),
    now = Date.now()
  // A thumbnail is derived, not editable content or a trusted image from an external file.
  delete document.thumb
  return { ...document, id: newId(), name: label, createdAt: now, updatedAt: now }
}
