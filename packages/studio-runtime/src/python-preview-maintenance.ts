import type { PythonInputGcBucket } from './python-input-gc'
import { createPythonMaintenanceCursor } from './python-maintenance-cursor'
import { collectPythonPreviewGarbage } from './python-previews'

interface PythonPreviewMaintenanceBucket extends PythonInputGcBucket {
  put(key: string, bytes: Uint8Array, options: { sha256: string }): Promise<unknown>
}

export function collectStoredPythonPreviewGarbage(bucket: PythonPreviewMaintenanceBucket) {
  const signal = AbortSignal.timeout(25_000)
  return collectPythonPreviewGarbage({
    bucket,
    signal,
    cursor: createPythonMaintenanceCursor(bucket, 'maintenance/python-preview-cursor.json', signal),
  })
}
