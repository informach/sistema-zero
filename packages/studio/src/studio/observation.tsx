import { createContext, useContext } from 'react'
import type { StudioPlayerOriginAdapter } from '../components/preview/playerOriginAdapter'

export interface StudioExecutionPolicy {
  editingAccess: 'author' | 'observer'
  autoRun: boolean
  originAdapter?: StudioPlayerOriginAdapter
  requireIsolatedPreview: boolean
  muted: boolean
}

const executionContext = createContext<StudioExecutionPolicy>({
  editingAccess: 'author',
  autoRun: true,
  requireIsolatedPreview: false,
  muted: false,
})
export const StudioExecutionProvider = executionContext.Provider
export function useStudioExecution(): StudioExecutionPolicy {
  return useContext(executionContext)
}
