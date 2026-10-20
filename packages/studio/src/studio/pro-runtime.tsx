import type { StudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import { createContext, useContext } from 'react'
import type { Project, StudioProBuildLimits } from '#core'

export interface StudioProRuntimeBuildInput {
  project: Project
  signal?: AbortSignal
}

export type StudioProRuntimeBuildResult = (
  | { artifact: StudioProArtifact; html?: never }
  | { html: string; artifact?: never }
) & {
  output?: string
  durationMs?: number
}

/**
 * Compilador remoto opcional para projetos Pro. As aulas usam este contrato
 * para compilar no servidor sem exigir COOP, COEP ou WebContainer na página.
 * Ausente, o Estúdio mantém o runtime local do modo Pro completo.
 */
export interface StudioProRuntimeAdapter {
  /** Revoking this authority also withdraws an already compiled preview. */
  signal?: AbortSignal
  /** Cotas do compilador remoto; o Studio as impõe antes de persistir/compilar. */
  limits?: StudioProBuildLimits
  build(input: StudioProRuntimeBuildInput): Promise<StudioProRuntimeBuildResult>
}

const StudioProRuntimeContext = createContext<StudioProRuntimeAdapter | null>(null)

export const StudioProRuntimeProvider = StudioProRuntimeContext.Provider

export function useStudioProRuntime(): StudioProRuntimeAdapter | null {
  return useContext(StudioProRuntimeContext)
}
