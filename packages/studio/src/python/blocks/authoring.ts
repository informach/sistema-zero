import { selectStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'
import { describePythonCatalog } from './selection'

export { pythonOfficialModules } from '../officialModules'
export { type PythonCatalogEntry, selectPythonPalette } from './selection'

const programmingCatalog = describePythonCatalog(PYTHON_PROGRAMMING_CODECS)
let turtleCatalog: ReturnType<typeof describePythonCatalog> | undefined

/** Resolve only local editor code; executable distributions have a separate runtime boundary. */
export async function loadPythonAuthoring(
  project: {
    runtime: PythonProjectDocument['runtime']
    installedExtensions: readonly { id: string; version: string }[]
  },
  environment: Pick<StudioRuntimeEnvironment, 'catalog' | 'pythonAuthoring'> | null,
) {
  const release = environment && selectStudioRuntimeRelease(environment.catalog, project.runtime)
  const approval = environment?.pythonAuthoring?.find(
    ({ runtime }) =>
      runtime.profileId === project.runtime.profileId &&
      runtime.releaseId === project.runtime.releaseId &&
      runtime.manifestSha256 === project.runtime.manifestSha256,
  )
  if (!release || !approval)
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
  if (turtle) {
    const { PYTHON_TURTLE_CODECS } = await import('../extensions/turtle/catalog')
    codecs = [...codecs, ...PYTHON_TURTLE_CODECS]
    turtleCatalog ??= describePythonCatalog(codecs)
  }
  return {
    codecs,
    catalog: turtle ? turtleCatalog! : programmingCatalog,
    approvedBlockIds: new Set(approval.blockIds),
    installedExtensions: new Set(installed.map((extension) => extension.id)),
  }
}
