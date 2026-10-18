import type { PythonProjectDocument } from '../core/editableProject'
import { createContextualRuntimeEnvironment } from './contextEnvironment'

/** Public host sends only the publication identity. The BFF derives all authority
 * metadata from the visible immutable revision; editor candidates are never uploaded.
 */
export function createPublicPythonRuntimeEnvironment(options: {
  project: PythonProjectDocument
  playId: string
  publicationRevision: string
  signal: AbortSignal
  request(
    input: { playId: string; publicationRevision: string },
    signal: AbortSignal,
  ): Promise<unknown>
  clock?: () => number
}) {
  const context = {
    kind: 'public' as const,
    playId: options.playId,
    publicationRevision: options.publicationRevision,
  }
  return createContextualRuntimeEnvironment({
    project: options.project,
    scope: { userId: null, context },
    signal: options.signal,
    clock: options.clock,
    request: (_candidate, signal) =>
      options.request(
        { playId: context.playId, publicationRevision: context.publicationRevision },
        signal,
      ),
  })
}
