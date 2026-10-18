import {
  StudioCatalogIdSchema,
  StudioExactVersionSchema,
  StudioPythonProjectConfigSchema,
  StudioRuntimeSelectionSchema,
} from '@sistemazero/core/studio/project-environment'
import { isStudioProjectId } from '@sistemazero/core/studio/project-format'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import { z } from 'zod'
import type { PythonExecutionSnapshot } from './protocol'

const extensionSchema = z.strictObject({
  id: StudioCatalogIdSchema,
  version: StudioExactVersionSchema,
})

const hash = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/** Bounded structured-clone payload. Path semantics are checked when mounting the FS. */
export function readPythonWireSnapshot(raw: unknown): PythonExecutionSnapshot {
  if (
    !record(raw) ||
    raw.version !== 1 ||
    !isStudioProjectId(raw.projectId) ||
    !hash(raw.revision) ||
    !record(raw.configuration) ||
    !Array.isArray(raw.files) ||
    raw.files.length > 208 ||
    !Array.isArray(raw.directories) ||
    raw.directories.length > 160 ||
    !raw.directories.every((path) => typeof path === 'string' && path.length <= 512) ||
    !Array.isArray(raw.configuration.extensions) ||
    raw.configuration.extensions.length > 256
  )
    throw new Error('Snapshot Python inválido.')
  const runtime = StudioRuntimeSelectionSchema.parse(raw.configuration.runtime)
  const python = StudioPythonProjectConfigSchema.parse(raw.configuration.python)
  const extensions = raw.configuration.extensions.map((value) => extensionSchema.parse(value))
  if (python.dependencyLock.runtimeManifestSha256 !== runtime.manifestSha256)
    throw new Error('O lock não pertence ao ambiente do snapshot.')
  let total = 0
  const files: PythonExecutionSnapshot['files'] = []
  for (const file of raw.files) {
    if (
      !record(file) ||
      typeof file.path !== 'string' ||
      file.path.length > 512 ||
      (file.kind !== 'source' && file.kind !== 'asset') ||
      !hash(file.sha256) ||
      !(file.bytes instanceof Uint8Array) ||
      !(file.bytes.buffer instanceof ArrayBuffer)
    )
      throw new Error('Arquivo do snapshot Python inválido.')
    total += file.bytes.byteLength
    if (total > STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes)
      throw new Error('O snapshot Python excede a cota de execução.')
    files.push({
      path: file.path,
      kind: file.kind,
      sha256: file.sha256,
      bytes: file.bytes as Uint8Array<ArrayBuffer>,
    })
  }
  return {
    version: 1,
    projectId: raw.projectId,
    revision: raw.revision,
    configuration: { runtime, python, extensions },
    directories: [...raw.directories],
    files,
  }
}
