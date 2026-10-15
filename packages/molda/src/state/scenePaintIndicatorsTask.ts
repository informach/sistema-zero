import type { MoldaSceneDocument } from '../scene/document'
import {
  cacheScenePaintColors,
  type prepareScenePaintIndicators,
  type ScenePaintColorJob,
} from '../scene/paintIndicators'
import { scenePaintColorsInWorker } from '../workers/scenePaintColors'

/** One worker at a time; source buffers stay owned by the document. Aborted/foreign work
 * never publishes indicators or fills the cache used by the next revision. */
export async function resolveScenePaintIndicators(
  source: MoldaSceneDocument,
  plan: ReturnType<typeof prepareScenePaintIndicators>,
  revision: number,
  signal: AbortSignal,
  compute = scenePaintColorsInWorker,
) {
  const resolved = new Map<ScenePaintColorJob, readonly string[]>()
  for (const job of plan.pending) {
    signal.throwIfAborted()
    const colors = await compute({ ...job, documentId: source.id, revision }, signal)
    signal.throwIfAborted()
    resolved.set(job, colors)
    cacheScenePaintColors(job, colors)
  }
  // The plan retains small/cached results too; shared images may have more material
  // variants than the bounded cross-revision cache. Never rescan synchronously here.
  return plan.finish(resolved)
}
