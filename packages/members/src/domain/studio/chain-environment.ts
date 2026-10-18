import {
  studioProjectContinuityIssue,
  studioProjectContinuityReference,
} from '@sistemazero/core/studio/project-continuity'
import { ValidationError } from '../shared/errors'

export type StudioChainEnvironment = ReturnType<typeof studioProjectContinuityReference>
export interface StudioChainCandidate {
  chain: string
  project: unknown
}

export function studioChainCandidate(content: unknown): StudioChainCandidate[] {
  if (!content || typeof content !== 'object') return []
  const block = content as Record<string, unknown>
  const chain = typeof block.chain === 'string' ? block.chain.trim() : ''
  return block.kind === 'studio' && chain
    ? [{ chain, project: block.initialProject ?? { formatVersion: 2 } }]
    : []
}

/**
 * Named chains keep their environment even after the last block is removed/renamed.
 * null is a retired, ambiguous historical chain, never an executable environment.
 * Source, assets and curation are deliberately absent from the durable contract.
 */
export function reconcileStudioChainEnvironment(
  chain: string,
  registered: StudioChainEnvironment | null | undefined,
  historicalProjects: unknown[],
  candidates: unknown[],
): StudioChainEnvironment | null {
  const history = registered === undefined ? historicalProjects : [registered]
  const first = history.length ? history[0] : candidates[0]
  const consistent =
    first !== undefined &&
    [...history, first].every((project) => !studioProjectContinuityIssue(first, project))
  const environment = consistent ? studioProjectContinuityReference(first) : null
  if (
    candidates.some((project) => !environment || studioProjectContinuityIssue(environment, project))
  )
    throw new ValidationError(
      `A cadeia "${chain}" já está associada a outro ambiente de programação ou tem um histórico incompatível. ` +
        'Use a mesma linguagem, tipo de estúdio, versão do ambiente e template, ou dê outro nome à cadeia.',
    )
  return environment
}
