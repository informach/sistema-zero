import { createContext, useContext } from 'react'
import type { Project } from '#core'

export interface StudioProRuntimeBuildInput {
  project: Project
  signal?: AbortSignal
}

export interface StudioProRuntimeBuildResult {
  html: string
  output?: string
  durationMs?: number
}

/**
 * Compilador remoto opcional para projetos Pro. As aulas usam este contrato
 * para compilar no servidor sem exigir COOP, COEP ou WebContainer na página.
 * Ausente, o Estúdio mantém o runtime local do modo Pro completo.
 */
export interface StudioProRuntimeAdapter {
  build(input: StudioProRuntimeBuildInput): Promise<StudioProRuntimeBuildResult>
}

const StudioProRuntimeContext = createContext<StudioProRuntimeAdapter | null>(null)

export const StudioProRuntimeProvider = StudioProRuntimeContext.Provider

export function useStudioProRuntime(): StudioProRuntimeAdapter | null {
  return useContext(StudioProRuntimeContext)
}
