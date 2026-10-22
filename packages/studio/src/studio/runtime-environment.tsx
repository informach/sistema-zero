import { createContext, useContext, useSyncExternalStore } from 'react'
import type { StudioRuntimeEnvironment } from '../runtime/environment'

const Context = createContext<StudioRuntimeEnvironment | null>(null)
export const StudioRuntimeEnvironmentProvider = Context.Provider
const noSubscription = () => () => {}
const noSnapshot = () => null

/** Subscribe without changing environment identity or recreating its parsers/registry. */
export function useStudioRuntimeAuthority(environment: StudioRuntimeEnvironment | null) {
  return useSyncExternalStore(
    environment?.authority?.subscribe ?? noSubscription,
    environment?.authority?.getSnapshot ?? noSnapshot,
    environment?.authority?.getSnapshot ?? noSnapshot,
  )
}

export function useStudioRuntimeEnvironment() {
  const environment = useContext(Context)
  useStudioRuntimeAuthority(environment)
  return environment
}
