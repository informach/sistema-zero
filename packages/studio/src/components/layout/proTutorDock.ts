import { createContext, type ReactNode, useContext } from 'react'

// Shell owns telemetry/boundaries; the Pro workspace owns the stable presentation slot.
export const ProTutorDockContext = createContext<ReactNode>(null)
export function useProTutorDock(): ReactNode {
  return useContext(ProTutorDockContext)
}
