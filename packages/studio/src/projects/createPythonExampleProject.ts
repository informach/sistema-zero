import {
  isStudioPortablePath,
  studioPortableFileConflict,
} from '@sistemazero/core/studio/portable-path'
import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { ulid } from 'ulid'
import type { StudioProjectFactoryContext } from '../core/projectFactory'
import type { PythonExampleCreationPort, PythonExampleEntry } from '../examples/pythonCatalog'
import { persistProject } from '../state/persistence'
import { captureProjectStorageScope } from '../state/projectStorageRuntime'

function supportsExample(
  context: StudioProjectFactoryContext,
  extensions: PythonExampleEntry['extensions'],
  requiredModules: PythonExampleEntry['requiredProvidedModules'],
) {
  const release = selectStudioRuntimeRelease(context.catalog, context.runtime)
  return (
    context.releaseStatus === 'active' &&
    release?.manifest.programmingLanguage === 'python' &&
    release.manifest.kinds.includes('pro') &&
    release.manifest.modes.includes('code') &&
    extensions.every((extension) =>
      release.manifest.extensions.some(
        (available) =>
          available.id === extension.id && available.versions.includes(extension.version),
      ),
    ) &&
    (requiredModules ?? []).every((required) =>
      release.manifest.python?.providedModules?.some(
        ({ descriptor }) =>
          descriptor.importName === required.importName && descriptor.version === required.version,
      ),
    )
  )
}

/** A detached candidate is authorized and validated before its only storage write. */
export async function createPythonExampleProject(
  entry: PythonExampleEntry,
  port: PythonExampleCreationPort,
  options: { signal: AbortSignal; isCurrent(): boolean },
) {
  const scope = captureProjectStorageScope()
  const { name, load } = entry
  const { prepare, authorizeExample } = port
  const { isCurrent } = options
  const extensions = entry.extensions.map(({ id, version }) => ({ id, version }))
  const requiredModules = entry.requiredProvidedModules?.map(({ importName, version }) => ({
    importName,
    version,
  }))
  const signal = AbortSignal.any([
    options.signal,
    ...(port.signal ? [port.signal] : []),
    ...(scope.signal ? [scope.signal] : []),
  ])
  const current = () => {
    signal.throwIfAborted()
    if (captureProjectStorageScope() !== scope || !isCurrent())
      throw new Error('A criação foi cancelada ou o perfil mudou.')
  }
  current()
  const selected = port.environments.find(
    ({ kind, context }) => kind === 'pro' && supportsExample(context, extensions, requiredModules),
  )
  if (!selected) throw new Error('Este exemplo precisa de um ambiente Python Pro compatível.')
  const environmentKey = selected.key
  const payload = structuredClone(await load())
  current()
  const context = structuredClone(await prepare({ kind: 'pro', environmentKey }))
  current()
  if (!supportsExample(context, extensions, requiredModules))
    throw new Error('O ambiente Python Pro atualizado não é compatível com este exemplo.')
  const { createEditableStudioProject } = await import('../core/projectFactory')
  current()
  const base = await createEditableStudioProject(
    { id: ulid(), name, programmingLanguage: 'python', kind: 'pro' },
    context,
  )
  current()
  if (base.programmingLanguage !== 'python' || base.kind !== 'pro')
    throw new Error('Projeto Python Pro inválido.')
  const files = { ...payload.files }
  if (
    Object.keys(files).some((path) => !isStudioPortablePath(path)) ||
    studioPortableFileConflict(Object.keys(files))
  )
    throw new Error('O exemplo contém caminhos de arquivos inválidos ou conflitantes.')
  if (files['requirements.txt'] !== undefined && files['requirements.txt'] !== '')
    throw new Error('As dependências deste exemplo ainda não estão disponíveis neste ambiente.')
  files['requirements.txt'] ??= ''
  const { pythonFilesToTree, refinePythonProjectDocument } = await import(
    '../state/pythonProjectValidation'
  )
  current()
  const project = await refinePythonProjectDocument({
    ...base,
    python: { ...base.python, entrypoint: payload.entrypoint },
    tree: pythonFilesToTree(files),
    assets: payload.assets ?? [],
    installedExtensions: extensions.map((extension) => ({ ...extension, installedAt: Date.now() })),
  })
  current()
  const { buildPythonAssetBundle } = await import('../core/pythonAssets')
  current()
  await buildPythonAssetBundle(project.assets, {
    files: Object.keys(files),
    directories:
      project.kind === 'pro'
        ? Object.entries(project.tree)
            .filter(([, node]) => node.kind === 'dir')
            .map(([path]) => path)
        : [],
  })
  current()
  await authorizeExample(structuredClone(project), signal)
  current()
  await persistProject(project, {}, scope)
  current()
  return project
}
