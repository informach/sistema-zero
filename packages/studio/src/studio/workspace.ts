import type { ProWorkspacePreferences } from '../modes/pro/workspace/model'

/** Static per Studio instance. Hosts with custom persistence can scope preferences themselves. */
export interface StudioWorkspacePreferencesAdapter {
  load(projectId: string): Promise<unknown>
  save(projectId: string, preferences: ProWorkspacePreferences): Promise<void>
}
export type { ProWorkspacePreferences }
