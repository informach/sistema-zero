import { sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { pythonExternalDependenciesIssue } from '@sistemazero/core/studio/python-dependency-policy'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import { digestAssetBytes } from '../../core/assetBinary'
import type { PintaRegionalProjectAdmissions } from '../../core/pintaRegionalProjectAdmission'
import {
  hasRegionalPintaReference,
  PRIVATE_REGIONAL_PROJECT,
  type PrivateRegionalProjectReadOptions,
  UNSUPPORTED_PINTA_REGION,
} from '../../core/pintaRegionalReference'
import { isDocumentRecord } from '../../core/projectDocument'
import { buildPythonAssetBundle } from '../../core/pythonAssets'
import { assertPythonVisualDraftSettled } from '../../python/blocks/workspaceDraft'
import { isPrivateRegionalProjectScope } from '../../state/projectStorageRuntime'
import {
  type PythonProjectDocument,
  pythonFilesToTree,
  refinePythonProjectDocument,
} from '../../state/pythonProjectValidation'
import { refinePythonProProjectDocument } from '../../state/pythonProProjectValidation'
import type { PythonExecutionSnapshot } from './protocol'

const snapshotsWithPintaScenes = new WeakSet<PythonExecutionSnapshot>()
export const requiresAdmittedPythonPintaScenes = (snapshot: PythonExecutionSnapshot) =>
  snapshotsWithPintaScenes.has(snapshot)

/** Does not approve a release, execute source or install extensions/dependencies. */
export async function preparePythonProExecutionSnapshot(
  raw: unknown,
): Promise<PythonExecutionSnapshot> {
  const project = await refinePythonProProjectDocument(raw)
  return snapshotFromDocument(project)
}

/** Same execution recipe for Classic, Pro, editor and anonymous player. */
export async function preparePythonExecutionSnapshot(
  raw: unknown,
  options: PrivateRegionalProjectReadOptions & { signal?: AbortSignal } = {},
): Promise<PythonExecutionSnapshot> {
  if (
    !isDocumentRecord(raw) ||
    !Array.isArray(raw.assets) ||
    !raw.assets.some(hasRegionalPintaReference)
  )
    return snapshotFromDocument(await refinePythonProjectDocument(raw))

  const scope = options[PRIVATE_REGIONAL_PROJECT]
  if (!scope || !isPrivateRegionalProjectScope(scope)) throw new Error(UNSUPPORTED_PINTA_REGION)
  const { signal } = options
  const lifetime =
    signal && scope.signal ? AbortSignal.any([signal, scope.signal]) : (signal ?? scope.signal)
  lifetime?.throwIfAborted()
  const captured = copyStudioProjectJson(raw)
  if (!isDocumentRecord(captured)) throw new Error('O projeto Python é inválido.')
  const [{ admitRegionalProjectAssets }, { checkRegionalProjectPixels }] = await Promise.all([
    import('../../core/pintaRegionalProjectAdmission'),
    import('../../core/pintaRegionalProjectPixels'),
  ])
  const regionalMaterials = await admitRegionalProjectAssets(
    captured.assets,
    lifetime,
    (_id, world) => checkRegionalProjectPixels(world, lifetime),
  )
  const project = await refinePythonProjectDocument(captured, { regionalMaterials })
  const snapshot = await snapshotFromDocument(project, regionalMaterials)
  lifetime?.throwIfAborted()
  snapshotsWithPintaScenes.add(snapshot)
  return snapshot
}

async function snapshotFromDocument(
  project: PythonProjectDocument,
  regionalMaterials?: PintaRegionalProjectAdmissions,
): Promise<PythonExecutionSnapshot> {
  assertPythonVisualDraftSettled(project)
  const tree = project.kind === 'pro' ? project.tree : pythonFilesToTree(project.files)
  const requirements = tree['requirements.txt']
  const requirementsSource = requirements?.kind === 'file' ? requirements.content : ''
  const dependencyIssue = pythonExternalDependenciesIssue(
    requirementsSource,
    project.python.dependencyLock,
  )
  if (dependencyIssue) throw new Error(dependencyIssue)
  if (project.python.dependencyLock.requirementsSha256 !== (await sha256Hex(requirementsSource)))
    throw new Error(
      'Atualize as dependências antes de executar: o lock não corresponde ao requirements.txt.',
    )
  const source = Object.entries(tree).flatMap(([path, node]) =>
    node.kind === 'file' ? [{ path, content: node.content }] : [],
  )
  const directories = Object.entries(tree)
    .flatMap(([path, node]) => (node.kind === 'dir' ? [path] : []))
    .sort()
  const bundle = await buildPythonAssetBundle(
    project.assets,
    { files: source.map((file) => file.path), directories },
    regionalMaterials,
  )
  const files: PythonExecutionSnapshot['files'] = []
  const encoder = new TextEncoder()
  for (const { path, content } of source) {
    const bytes = encoder.encode(content)
    files.push({ path, kind: 'source', sha256: await digestAssetBytes(bytes), bytes })
  }
  for (const entry of bundle.manifest.assets)
    files.push({
      path: entry.path,
      kind: 'asset',
      sha256: entry.sha256,
      bytes: bundle.files.get(entry.path)!,
    })
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  if (
    files.reduce((sum, file) => sum + file.bytes.byteLength, 0) >
    STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes
  )
    throw new Error('O snapshot Python excede a cota de execução.')
  const configuration = {
    runtime: project.runtime,
    extensions: project.installedExtensions.map(({ id, version }) => ({ id, version })),
    python: project.python,
  }
  // Execution content, including unsaved buffers. Neither UI metadata nor the
  // persistence counter belongs to this digest; project/run identity is separate.
  const revision = await studioPythonExecutionRevision({
    version: 1,
    configuration,
    directories,
    files: files.map(({ path, kind, sha256, bytes }) => ({
      path,
      kind,
      sha256,
      byteLength: bytes.byteLength,
    })),
  })
  return { version: 1, projectId: project.id, revision, configuration, directories, files }
}
