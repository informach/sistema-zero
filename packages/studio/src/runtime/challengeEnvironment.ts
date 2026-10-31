import type {
  StudioArquipelagoRuntimeContext,
  StudioArquipelagoRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import type { PythonProjectDocument } from '../core/editableProject'
import { createContextualRuntimeEnvironmentCore } from './contextEnvironmentCore'

/**
 * Challenge opened in the Arquipélago (C02b): editing, running and the runtime's own analysis
 * frame (the blocks/code bridge), without the remote language server, export, publication or
 * REPL. Every operation asks the host again; the game service and Members decide.
 */
export function createArquipelagoChallengeRuntimeEnvironment(options: {
  project: PythonProjectDocument
  userId: string
  context: Omit<StudioArquipelagoRuntimeContext, 'kind'>
  signal: AbortSignal
  request(input: StudioArquipelagoRuntimeRequest, signal: AbortSignal): Promise<unknown>
  clock?: () => number
}) {
  const context = { kind: 'arquipelago' as const, ...options.context }
  return createContextualRuntimeEnvironmentCore(
    {
      project: options.project,
      scope: { userId: options.userId, context },
      signal: options.signal,
      clock: options.clock,
      request: (candidate, signal) => {
        if (candidate.operation === 'python-repl')
          throw new Error('O desafio não abre o terminal Python.')
        return options.request({ ...candidate, operation: candidate.operation, context }, signal)
      },
    },
    null,
  )
}
