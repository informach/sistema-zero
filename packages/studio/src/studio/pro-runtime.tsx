import type { StudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import { createContext, type ReactNode, useContext } from 'react'
import type { Project, StudioProBuildLimits } from '#core'
import type { PrepareProDependencies } from '../state/proToolchainUpdate'

export type { PrepareProDependencies } from '../state/proToolchainUpdate'

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
  prepareDependencies?: PrepareProDependencies
  build(input: StudioProRuntimeBuildInput): Promise<StudioProRuntimeBuildResult>
}

const StudioProRuntimeContext = createContext<StudioProRuntimeAdapter | null>(null)

export function StudioProRuntimeProvider({
  value,
  prepareDependencies,
  children,
}: {
  value: StudioProRuntimeAdapter | null
  prepareDependencies?: PrepareProDependencies
  children: ReactNode
}) {
  return (
    <StudioProDependenciesContext.Provider value={prepareDependencies}>
      <StudioProRuntimeContext.Provider value={value}>{children}</StudioProRuntimeContext.Provider>
    </StudioProDependenciesContext.Provider>
  )
}

export function useStudioProRuntime(): StudioProRuntimeAdapter | null {
  return useContext(StudioProRuntimeContext)
}

const StudioProDependenciesContext = createContext<PrepareProDependencies | undefined>(undefined)
export const StudioProDependenciesProvider = StudioProDependenciesContext.Provider
export function useStudioProDependencies() {
  const runtime = useStudioProRuntime()
  const prepare = useContext(StudioProDependenciesContext)
  return runtime ? runtime.prepareDependencies : prepare
}
