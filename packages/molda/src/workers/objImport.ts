import { type ObjImportProgress, readObjImportReply } from './objImportProtocol'
import { type ObjImportRequest, readObjImportRequest } from './objImportRequest'
import { runWorkerTask, type TaskWorker } from './workerTask'

/** Review only. The host must still guard its live revision and require explicit adoption. */
export async function prepareObjImportInWorker(
  request: ObjImportRequest,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: ObjImportProgress) => void
    createWorker?: () => TaskWorker
  } = {},
) {
  if (options.signal?.aborted) throw new DOMException('Task cancelled', 'AbortError')
  const snapshot = readObjImportRequest(request, true)
  return runWorkerTask({
    request: snapshot,
    signal: options.signal,
    onProgress: options.onProgress,
    createWorker:
      options.createWorker ??
      (() => new Worker(new URL('./objImport.worker.ts', import.meta.url), { type: 'module' })),
    readReply: (raw) => readObjImportReply(raw, snapshot),
  })
}
