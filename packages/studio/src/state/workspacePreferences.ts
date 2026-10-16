import { createStore, get, set } from 'idb-keyval'
import type { StudioWorkspacePreferencesAdapter } from '../studio/workspace'
import { captureProjectStorageScope } from './projectStorageRuntime'

/** Separate database: UI writes never delay a project save, export or pagehide flush. */
export function createLocalWorkspacePreferences(): StudioWorkspacePreferencesAdapter {
  const scope = captureProjectStorageScope()
  const store = createStore(`sz-studio-workspace:${scope.identity}`, 'preferences')
  return {
    load: (projectId) => get(`pro:${projectId}`, store),
    save: (projectId, preferences) => set(`pro:${projectId}`, preferences, store),
  }
}
