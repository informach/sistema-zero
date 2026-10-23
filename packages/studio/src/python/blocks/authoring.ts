import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'
import { describePythonCatalog, selectPythonPalette } from './selection'

export { pythonOfficialModules } from '../officialModules'
export { type PythonCatalogEntry, selectPythonPalette } from './selection'

const programmingCatalog = describePythonCatalog(PYTHON_PROGRAMMING_CODECS)
const turtleCatalogs = new Map<string, ReturnType<typeof describePythonCatalog>>()

/** Resolve only local editor code; executable distributions have a separate runtime boundary. */
export async function loadPythonAuthoring(
  project: {
    runtime: PythonProjectDocument['runtime']
    installedExtensions: readonly { id: string; version: string }[]
  },
  environment: Pick<StudioRuntimeEnvironment, 'catalog' | 'pythonAuthoring'> | null,
) {
  const release = environment && selectStudioRuntimeRelease(environment.catalog, project.runtime)
  const python = release?.manifest.python
  const approval = environment?.pythonAuthoring?.find(
    ({ runtime }) =>
      runtime.profileId === project.runtime.profileId &&
      runtime.releaseId === project.runtime.releaseId &&
      runtime.manifestSha256 === project.runtime.manifestSha256,
  )
  if (!release || !python || !approval)
    throw new Error('Os blocos Python deste projeto ainda não estão disponíveis neste espaço.')
  const installed = project.installedExtensions.filter((extension) =>
    release.manifest.extensions.some(
      (known) => known.id === extension.id && known.versions.includes(extension.version),
    ),
  )
  const turtle = installed.some(
    (extension) =>
      extension.id === TURTLE_EXTENSION.id && extension.version === TURTLE_EXTENSION.version,
  )
  let codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS
  let catalog = programmingCatalog
  if (turtle) {
    const { PYTHON_TURTLE_CODECS } = await import('../extensions/turtle/catalog')
    const available = PYTHON_TURTLE_CODECS.filter((codec) =>
      (codec.requiredRuntimeFeatures ?? []).every((feature) => python.features.includes(feature)),
    )
    // Specific official calls must precede the generic call/attribute codecs.
    codecs = [...available, ...PYTHON_PROGRAMMING_CODECS]
    const key = available.map((codec) => codec.id).join('|')
    catalog = turtleCatalogs.get(key) ?? describePythonCatalog(codecs)
    turtleCatalogs.set(key, catalog)
  }
  return {
    codecs,
    catalog,
    approvedBlockIds: new Set(approval.blockIds),
    installedExtensions: new Set(installed.map((extension) => extension.id)),
  }
}

/** Refresh only the offer. Loaded codecs still describe existing saved blocks after revocation. */
export function selectCurrentPythonPalette(
  loaded: Awaited<ReturnType<typeof loadPythonAuthoring>>,
  runtime: PythonProjectDocument['runtime'],
  environment: StudioRuntimeEnvironment,
  learning: Pick<
    Parameters<typeof selectPythonPalette>[0],
    'level' | 'allowBlocks' | 'allowCategories'
  >,
) {
  const snapshot = environment.authority?.getSnapshot()
  if (!snapshot) return selectPythonPalette({ ...loaded, ...learning })
  const approval = snapshot.pythonAuthoring.find(
    (item) =>
      item.runtime.profileId === runtime.profileId &&
      item.runtime.releaseId === runtime.releaseId &&
      item.runtime.manifestSha256 === runtime.manifestSha256,
  )
  const extensions = new Set(
    snapshot.available
      ? [...loaded.installedExtensions].filter((id) => snapshot.grantedExtensionIds.includes(id))
      : [],
  )
  const approved = new Set(snapshot.available ? (approval?.blockIds ?? []) : [])
  for (const entry of loaded.catalog)
    if (entry.owner !== 'programming' && !extensions.has(entry.owner)) approved.delete(entry.id)
  // An authority reduction may remove a dependency. Never restore it by expanding a grant.
  let changed = true
  while (changed) {
    changed = false
    for (const entry of loaded.catalog)
      if (approved.has(entry.id) && entry.dependencies.some((id) => !approved.has(id))) {
        approved.delete(entry.id)
        changed = true
      }
  }
  const allowBlocks = learning.allowBlocks?.length
    ? learning.allowBlocks.filter((id) => approved.has(id))
    : learning.allowBlocks
  // Explicit curation whose entire offer was withdrawn is empty, not a request for level defaults.
  if (learning.allowBlocks?.length && !allowBlocks?.length) approved.clear()
  return selectPythonPalette({
    ...loaded,
    ...learning,
    allowBlocks,
    approvedBlockIds: approved,
    installedExtensions: extensions,
  })
}
