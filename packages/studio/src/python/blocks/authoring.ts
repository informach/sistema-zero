import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'
import { attachPythonResolverOptions } from './resolverOptions'
import type { PythonResolverOptions } from './scope'
import { describePythonCatalog, selectPythonPalette } from './selection'

export { pythonOfficialModules } from '../officialModules'
export { type PythonCatalogEntry, selectPythonPalette } from './selection'

const programmingCatalog = describePythonCatalog(PYTHON_PROGRAMMING_CODECS)
const extensionCatalogs = new Map<
  string,
  { codecs: readonly PythonBlockCodec[]; catalog: ReturnType<typeof describePythonCatalog> }
>()

/**
 * The codec order of the editor for one extension and the runtime features of a release: the
 * extension's supported calls first, then the programming codecs. A qualification receipt
 * records this order, and its reader recomputes it from the current catalog.
 */
export function orderPythonAuthoringCodecs(
  extensionCodecs: readonly PythonBlockCodec[] | undefined,
  features: readonly string[],
): readonly PythonBlockCodec[] {
  if (!extensionCodecs) return PYTHON_PROGRAMMING_CODECS
  const supported = (codec: PythonBlockCodec) =>
    (codec.requiredRuntimeFeatures ?? []).every((feature) => features.includes(feature))
  return [...extensionCodecs.filter(supported), ...PYTHON_PROGRAMMING_CODECS]
}

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
  const has = (extension: { id: string; version: string }) =>
    installed.some((item) => item.id === extension.id && item.version === extension.version)
  let codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS
  let catalog = programmingCatalog
  let extension: { codecs: readonly PythonBlockCodec[]; options: PythonResolverOptions } | undefined
  if (has(TURTLE_EXTENSION)) {
    const { PYTHON_TURTLE_CODECS, TURTLE_STAR_EXPORTS } = await import(
      '../extensions/turtle/catalog'
    )
    extension = {
      codecs: PYTHON_TURTLE_CODECS,
      options: { starExports: new Map([['turtle', TURTLE_STAR_EXPORTS]]) },
    }
  } else if (has(PGZERO_EXTENSION)) {
    const { PYTHON_PGZERO_CODECS, PGZERO_RESOLVER_OPTIONS } = await import(
      '../extensions/pgzero/catalog'
    )
    extension = { codecs: PYTHON_PGZERO_CODECS, options: PGZERO_RESOLVER_OPTIONS }
  } else if (has(RAYLIB_2D_EXTENSION)) {
    const { PYTHON_RAYLIB_2D_CODECS, RAYLIB_RESOLVER_OPTIONS } = await import(
      '../extensions/raylib2d/catalog'
    )
    extension = { codecs: PYTHON_RAYLIB_2D_CODECS, options: RAYLIB_RESOLVER_OPTIONS }
  } else if (has(RAYLIB_3D_EXTENSION)) {
    const { PYTHON_RAYLIB_3D_CODECS, RAYLIB_RESOLVER_OPTIONS } = await import(
      '../extensions/raylib3d/catalog'
    )
    extension = { codecs: PYTHON_RAYLIB_3D_CODECS, options: RAYLIB_RESOLVER_OPTIONS }
  }
  if (extension) {
    // Specific official calls must precede the generic call/attribute codecs.
    const ordered = orderPythonAuthoringCodecs(extension.codecs, python.features)
    const key = ordered.map((codec) => codec.id).join('|')
    const cached = extensionCatalogs.get(key)
    codecs = cached?.codecs ?? attachPythonResolverOptions(ordered, extension.options)
    catalog = cached?.catalog ?? describePythonCatalog(codecs)
    extensionCatalogs.set(key, { codecs, catalog })
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
