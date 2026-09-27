import { type BbmodelImportProgress, readBbmodelImportReply } from './bbmodelImportProtocol'
import { type BbmodelImportRequest, readBbmodelImportRequest } from './bbmodelImportRequest'
import { runWorkerTask, type TaskWorker } from './workerTask'

/** Review only. The host still owns live-revision guards, preview and explicit transactional adoption. */
export async function prepareBbmodelImportInWorker(
  request: BbmodelImportRequest,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: BbmodelImportProgress) => void
    createWorker?: () => TaskWorker
  } = {},
) {
  if (options.signal?.aborted) throw new DOMException('Task cancelled', 'AbortError')
  const snapshot = readBbmodelImportRequest(request, true)
  return runWorkerTask({
    request: snapshot,
    signal: options.signal,
    onProgress: options.onProgress,
    createWorker:
      options.createWorker ??
      (() => new Worker(new URL('./bbmodelImport.worker.ts', import.meta.url), { type: 'module' })),
    readReply: (raw) => readBbmodelImportReply(raw, snapshot),
  })
}
