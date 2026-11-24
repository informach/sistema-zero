import {
  projectApplicationsKey,
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectMigrationKey,
  projectStateKey,
  projectThumbKey,
} from './projectStorageKeys'
import { gameStorageKey } from './projectStorageRuntime'
import type { RetainedPart } from './retainedProjectParts'

export function legacyProjectKeys(id: string): Record<RetainedPart, string> {
  return {
    meta: projectMetaKey(id),
    files: projectFilesKey(id),
    state: projectStateKey(id),
    blocks: projectBlocksKey(id),
    assets: projectAssetsKey(id),
    thumb: projectThumbKey(id),
    head: projectHeadKey(id),
    applications: projectApplicationsKey(id),
    source: projectMigrationKey(id),
    game: gameStorageKey(id),
  }
}
