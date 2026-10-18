import { collectPythonInputGarbage, type PythonInputGcBucket } from './python-input-gc'
import { createPythonMaintenanceCursor } from './python-maintenance-cursor'

interface PythonInputMaintenanceBucket extends PythonInputGcBucket {
  put(key: string, bytes: Uint8Array, options: { sha256: string }): Promise<unknown>
}

/** One page per cron. Checkpoint writes occur only after confirmed, generation-specific deletion. */
export function collectStoredPythonInputGarbage(bucket: PythonInputMaintenanceBucket) {
  const signal = AbortSignal.timeout(25_000)
  return collectPythonInputGarbage({
    bucket,
    signal,
    cursor: createPythonMaintenanceCursor(bucket, 'maintenance/python-input-cursor.json', signal),
  })
}
