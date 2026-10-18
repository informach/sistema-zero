import { createContext, useContext } from 'react'
import type { StudioRuntimeEnvironment } from '../runtime/environment'

const Context = createContext<StudioRuntimeEnvironment | null>(null)
export const StudioRuntimeEnvironmentProvider = Context.Provider
export const useStudioRuntimeEnvironment = () => useContext(Context)
