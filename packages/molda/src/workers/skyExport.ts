import type { MoldaSkyAsset } from '../core/model'
import type { SkyHdrResult } from '../export/skyHdr'
import { SKY_EXPORT_SIZE } from '../sky/render'
import {
  readSkyExportReply,
  type SkyExportProgress,
  type SkyExportRequest,
} from './skyExportProtocol'
import { runWorkerTask } from './workerTask'

export interface SkyExportOptions {
  signal?: AbortSignal
  revision?: number
  onProgress?: (progress: SkyExportProgress) => void
  /** Lower-resolution portable exports; cannot exceed the native export budget. */
  size?: { width: number; height: number }
}

export function exportSkyHdrInWorker(
  asset: MoldaSkyAsset,
  options: SkyExportOptions = {},
): Promise<SkyHdrResult> {
  const size = options.size ?? SKY_EXPORT_SIZE
  if (
    !Number.isInteger(size.width) ||
    size.width < 1 ||
    size.width > SKY_EXPORT_SIZE.width ||
    !Number.isInteger(size.height) ||
    size.height < 1 ||
    size.height > SKY_EXPORT_SIZE.height
  )
    return Promise.reject(new RangeError('Sky export dimensions exceed the budget'))
  const request: SkyExportRequest = {
    documentId: asset.id,
    revision: options.revision ?? asset.updatedAt,
    params: asset.params,
    size,
  }
  return runWorkerTask({
    createWorker: () =>
      new Worker(new URL('./skyExport.worker.ts', import.meta.url), { type: 'module' }),
    request,
    readReply: (value) => readSkyExportReply(value, request),
    signal: options.signal,
    onProgress: options.onProgress,
  })
}
