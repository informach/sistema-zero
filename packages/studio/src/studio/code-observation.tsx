import { createContext, useContext } from 'react'
import type { StudioCodeObservation } from '../monaco/codeObservation'

const Context = createContext<StudioCodeObservation | null>(null)
export const StudioCodeObservationProvider = Context.Provider
export const useStudioCodeObservation = () => useContext(Context)
