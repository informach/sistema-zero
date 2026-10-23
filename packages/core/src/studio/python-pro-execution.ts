import { encodeOwnedUtf8 } from '../creations/utf8'
import { parseStudioProRevision } from './pro-revision'
import { pythonExternalDependenciesIssue } from './python-dependency-policy'
import {
  StudioPythonExecutionContentSchema,
  studioPythonExecutionRevision,
  verifyStudioPythonExecutionMetadata,
} from './python-execution-content'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from './python-material-policy'

interface BinaryReference {
  base64: string
  sha256: string
}

function captureBinaries(raw: unknown): Map<string, BinaryReference> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Materiais inválidos.')
  const entries = Object.entries(raw)
  if (entries.length > 208) throw new Error('Há materiais demais na revisão.')
  const captured = new Map<string, BinaryReference>()
  let bytes = 0
  for (const [path, value] of entries) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Material inválido.')
    const binary = value as Record<string, unknown>
    const base64 = binary.base64,
      sha256 = binary.sha256
    if (
      Object.keys(binary).length !== 2 ||
      typeof base64 !== 'string' ||
      typeof sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(sha256)
    )
      throw new Error('Referência de material inválida.')
    bytes +=
      Math.floor(base64.length / 4) * 3 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
    if (
      bytes > STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
    )
      throw new Error('Os materiais excedem a cota ou usam uma codificação inválida.')
    captured.set(path, { base64, sha256 })
  }
  return captured
}

async function digest(bytes: Uint8Array<ArrayBuffer>) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

/** Bridges the editor CAS revision to the existing execution identity. Grants remain host-owned.
 * Source/media are captured before awaiting and never exposed as borrowed mutable buffers. */
export async function prepareStudioPythonProExecution(
  rawRevision: unknown,
  rawBinaries: unknown,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted()
  const binaries = captureBinaries(rawBinaries)
  const base = await parseStudioProRevision(rawRevision)
  signal?.throwIfAborted()
  if (base.version !== 2 || base.configuration.programmingLanguage !== 'python')
    throw new Error('Esta revisão não é um projeto Pro Python.')
  const configuration = base.configuration
  const dependencyIssue = pythonExternalDependenciesIssue(
    base.files['requirements.txt'] ?? '',
    configuration.python.dependencyLock,
  )
  if (dependencyIssue) throw new Error(dependencyIssue)
  if (binaries.size !== Object.keys(base.assetFiles).length)
    throw new Error('Os materiais não correspondem à revisão.')
  const contents = new Map<string, Uint8Array<ArrayBuffer>>()
  const files: { path: string; kind: 'source' | 'asset'; sha256: string; byteLength: number }[] = []
  let total = 0
  const admit = async (
    path: string,
    kind: 'source' | 'asset',
    bytes: Uint8Array<ArrayBuffer>,
    expected?: string,
  ) => {
    signal?.throwIfAborted()
    total += bytes.byteLength
    if (total > STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes)
      throw new Error('O snapshot Python excede a cota de execução.')
    const sha256 = await digest(bytes)
    signal?.throwIfAborted()
    if (expected !== undefined && sha256 !== expected)
      throw new Error('Os bytes de um material não correspondem à revisão.')
    contents.set(path, bytes)
    files.push({ path, kind, sha256, byteLength: bytes.byteLength })
  }
  for (const [path, source] of Object.entries(base.files))
    await admit(path, 'source', encodeOwnedUtf8(source))
  for (const [path, expected] of Object.entries(base.assetFiles)) {
    const binary = binaries.get(path)
    if (!binary || binary.sha256 !== expected)
      throw new Error('Um material está ausente ou pertence a outra revisão.')
    const decoded = atob(binary.base64)
    const bytes = new Uint8Array(decoded.length)
    for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index)
    await admit(path, 'asset', bytes, expected)
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const content = StudioPythonExecutionContentSchema.parse({
    version: 1,
    configuration: {
      runtime: configuration.runtime,
      extensions: configuration.extensions,
      python: configuration.python,
    },
    directories: base.directories,
    files,
  })
  const revision = await studioPythonExecutionRevision(content)
  const metadata = await verifyStudioPythonExecutionMetadata({
    ...content,
    projectId: base.projectId,
    revision,
  })
  signal?.throwIfAborted()
  return {
    base,
    metadata,
    async read(path: string, operationSignal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
      operationSignal.throwIfAborted()
      signal?.throwIfAborted()
      const bytes = contents.get(path)
      if (!bytes) throw new Error('O arquivo não pertence a esta revisão Python.')
      return new Uint8Array(bytes)
    },
  }
}
