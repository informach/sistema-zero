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
  kind: PythonExampleEntry['kind'],
  extensions: PythonExampleEntry['extensions'],
  requiredModules: PythonExampleEntry['requiredProvidedModules'],
  requiredFeatures: PythonExampleEntry['requiredPythonFeatures'],
  requiredBlocks: readonly string[],
) {
  const release = selectStudioRuntimeRelease(context.catalog, context.runtime)
  return (
    context.releaseStatus === 'active' &&
    release?.manifest.programmingLanguage === 'python' &&
    release.manifest.kinds.includes(kind) &&
    (kind !== 'classic' || requiredBlocks.every((id) => context.authoringBlockIds?.includes(id))) &&
    (requiredFeatures ?? []).every((feature) =>
      release.manifest.python?.features.includes(feature),
    ) &&
    (kind === 'classic' ? (['blocks', 'bridge'] as const) : (['code'] as const)).every((mode) =>
      release.manifest.modes.includes(mode),
    ) &&
    extensions.every(
      (extension) =>
        (context.grantedExtensionIds === undefined ||
          context.grantedExtensionIds.includes(extension.id)) &&
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

async function assertExamplePalette(
  context: StudioProjectFactoryContext,
  kind: PythonExampleEntry['kind'],
  extensions: PythonExampleEntry['extensions'],
  requiredBlocks: readonly string[],
) {
  if (kind !== 'classic' || !requiredBlocks.length) return
  const { loadPythonAuthoring, selectPythonPalette } = await import('../python/blocks/authoring')
  const { resolvePythonLearningLevel } = await import('../python/learning')
  const authoring = await loadPythonAuthoring(
    { runtime: context.runtime, installedExtensions: extensions },
    {
      catalog: context.catalog,
      pythonAuthoring: [
        { runtime: context.runtime, blockIds: [...(context.authoringBlockIds ?? [])] },
      ],
    },
  )
  const curation = context.authoringCuration
  const palette = selectPythonPalette({
    ...authoring,
    level: resolvePythonLearningLevel(curation?.pythonLevel),
    allowBlocks: curation?.allowBlocks,
    allowCategories: curation?.allowCategories,
  })
  const available = new Set(palette.entries.map(({ id }) => id))
  const allowedModes = curation?.allowedModes
  if (
    requiredBlocks.some((id) => !available.has(id)) ||
    (allowedModes && !(['blocks', 'bridge'] as const).every((mode) => allowedModes.includes(mode)))
  )
    throw new Error('Este exemplo precisa de blocos e do modo Ponte disponíveis neste ambiente.')
}

/** A detached candidate is authorized and validated before its only storage write. */
export async function createPythonExampleProject(
  entry: PythonExampleEntry,
  port: PythonExampleCreationPort,
  options: { signal: AbortSignal; isCurrent(): boolean },
) {
  const scope = captureProjectStorageScope()
  const { name, load, kind } = entry
  const mode = entry.mode ?? (kind === 'pro' ? 'code' : 'blocks')
  const environmentName = kind === 'pro' ? 'Python Pro' : 'Python Clássico'
  const { prepare, authorizeExample } = port
  const { isCurrent } = options
  const extensions = entry.extensions.map(({ id, version }) => ({ id, version }))
  const requiredModules = entry.requiredProvidedModules?.map(({ importName, version }) => ({
    importName,
    version,
  }))
  const requiredFeatures = entry.requiredPythonFeatures
    ? [...entry.requiredPythonFeatures]
    : undefined
  const requiredBlocks = [...(entry.requiredBlockIds ?? [])]
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
    (environment) =>
      environment.kind === kind &&
      supportsExample(
        environment.context,
        kind,
        extensions,
        requiredModules,
        requiredFeatures,
        requiredBlocks,
      ),
  )
  if (!selected)
    throw new Error(`Este exemplo precisa de um ambiente ${environmentName} compatível.`)
  const environmentKey = selected.key
  await assertExamplePalette(structuredClone(selected.context), kind, extensions, requiredBlocks)
  current()
  const payload = structuredClone(await load())
  current()
  const context = structuredClone(await prepare({ kind, environmentKey }))
  current()
  if (
    !supportsExample(context, kind, extensions, requiredModules, requiredFeatures, requiredBlocks)
  )
    throw new Error(`O ambiente ${environmentName} atualizado não é compatível com este exemplo.`)
  await assertExamplePalette(context, kind, extensions, requiredBlocks)
  current()
  const { createEditableStudioProject } = await import('../core/projectFactory')
  current()
  const base = await createEditableStudioProject(
    { id: ulid(), name, programmingLanguage: 'python', kind },
    context,
  )
  current()
  if (base.programmingLanguage !== 'python' || base.kind !== kind)
    throw new Error(`Projeto ${environmentName} inválido.`)
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
    mode,
    python: { ...base.python, entrypoint: payload.entrypoint },
    ...(base.kind === 'pro' ? { tree: pythonFilesToTree(files) } : { files }),
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
  await authorizeExample(
    structuredClone(project),
    signal,
    kind === 'classic' && requiredBlocks.length
      ? {
          requiredBlockIds: requiredBlocks,
          requiredModes: ['blocks', 'bridge'],
        }
      : undefined,
  )
  current()
  await persistProject(project, {}, scope)
  current()
  return project
}
