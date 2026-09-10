import { type GltfImportProgress, readGltfImportReply } from './gltfImportProtocol'
import { type GltfImportRequest, readGltfImportRequest } from './gltfImportRequest'
import { runWorkerTask, type TaskWorker } from './workerTask'

/** Prepare a review only. Caller must guard its live revision and explicitly adopt the result. */
export async function prepareGltfImportInWorker(
  request: GltfImportRequest,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: GltfImportProgress) => void
    createWorker?: () => TaskWorker
  } = {},
) {
  if (options.signal?.aborted) throw new DOMException('Task cancelled', 'AbortError')
  const snapshot = readGltfImportRequest(request, true)
  return runWorkerTask({
    request: snapshot,
    signal: options.signal,
    onProgress: options.onProgress,
    createWorker:
      options.createWorker ??
      (() => new Worker(new URL('./gltfImport.worker.ts', import.meta.url), { type: 'module' })),
    readReply: (raw) => readGltfImportReply(raw, snapshot),
  })
}
