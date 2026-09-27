import { MOLDA_LIMITS } from '../core/limits'
import type { SkyHdrResult } from '../export/skyHdr'
import type { SkyParams } from '../sky/params'
import type { TaskReply } from './workerTask'

export type SkyExportProgress = 'rendering' | 'encoding'
export interface SkyExportRequest {
  documentId: string
  revision: number
  params: SkyParams
  size: { width: number; height: number }
}
export type SkyExportReply = Pick<SkyExportRequest, 'documentId' | 'revision'> &
  TaskReply<SkyHdrResult, SkyExportProgress>

function isHdrResult(value: unknown): value is SkyHdrResult {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false
  if (value.ok === false) return 'reason' in value && value.reason === 'too-big'
  return (
    value.ok === true &&
    'bytes' in value &&
    value.bytes instanceof Uint8Array &&
    value.bytes.byteLength <= MOLDA_LIMITS.studioMax3DChars &&
    'dataUrl' in value &&
    typeof value.dataUrl === 'string' &&
    value.dataUrl.startsWith('data:image/vnd.radiance;base64,') &&
    value.dataUrl.length <= MOLDA_LIMITS.studioMax3DChars &&
    'chars' in value &&
    value.chars === value.dataUrl.length &&
    'width' in value &&
    typeof value.width === 'number' &&
    Number.isInteger(value.width) &&
    value.width > 0 &&
    value.width <= 1024 &&
    'height' in value &&
    typeof value.height === 'number' &&
    Number.isInteger(value.height) &&
    value.height > 0 &&
    value.height <= 512
  )
}

/** The worker is ours; still validate the transport boundary and revision token. */
export function readSkyExportReply(
  value: unknown,
  request: Pick<SkyExportRequest, 'documentId' | 'revision'>,
): SkyExportReply | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('documentId' in value) ||
    value.documentId !== request.documentId ||
    !('revision' in value) ||
    value.revision !== request.revision ||
    !('type' in value)
  )
    return null
  const token = { documentId: request.documentId, revision: request.revision }
  if (
    value.type === 'progress' &&
    'progress' in value &&
    (value.progress === 'rendering' || value.progress === 'encoding')
  )
    return { ...token, type: 'progress', progress: value.progress }
  if (value.type === 'result' && 'result' in value && isHdrResult(value.result))
    return { ...token, type: 'result', result: value.result }
  if (value.type === 'error' && 'message' in value && typeof value.message === 'string')
    return { ...token, type: 'error', message: value.message }
  return null
}
