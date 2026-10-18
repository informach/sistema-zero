import {
  isPythonBootResourceName,
  PYTHON_BOOT_LIMITS,
  type PythonBootResourceName,
} from './bootResourceContract'

export type PythonBootRequest =
  | { protocol: 1; type: 'read'; id: number; name: PythonBootResourceName }
  | { protocol: 1; type: 'ack'; id: number }
export type PythonBootResponse =
  | { protocol: 1; type: 'resource'; id: number; name: PythonBootResourceName; bytes: ArrayBuffer }
  | { protocol: 1; type: 'failed'; message: string }
  | { protocol: 1; type: 'complete' }

const exactKeys = (value: object, keys: readonly string[]) => {
  const own = Reflect.ownKeys(value)
  return (
    own.length === keys.length && own.every((key) => typeof key === 'string' && keys.includes(key))
  )
}
const validId = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 1 &&
  value <= PYTHON_BOOT_LIMITS.requests

export function readPythonBootRequest(raw: unknown): PythonBootRequest | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('protocol' in raw) ||
    raw.protocol !== 1 ||
    !('type' in raw) ||
    !('id' in raw) ||
    !validId(raw.id)
  )
    return null
  if (raw.type === 'ack' && exactKeys(raw, ['protocol', 'type', 'id']))
    return { protocol: 1, type: 'ack', id: raw.id }
  if (
    raw.type === 'read' &&
    'name' in raw &&
    isPythonBootResourceName(raw.name) &&
    exactKeys(raw, ['protocol', 'type', 'id', 'name'])
  )
    return { protocol: 1, type: 'read', id: raw.id, name: raw.name }
  return null
}

export function readPythonBootResponse(raw: unknown): PythonBootResponse | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('protocol' in raw) ||
    raw.protocol !== 1 ||
    !('type' in raw)
  )
    return null
  if (raw.type === 'complete' && exactKeys(raw, ['protocol', 'type']))
    return { protocol: 1, type: 'complete' }
  if (
    raw.type === 'failed' &&
    'message' in raw &&
    typeof raw.message === 'string' &&
    raw.message.length <= 300 &&
    exactKeys(raw, ['protocol', 'type', 'message'])
  )
    return { protocol: 1, type: 'failed', message: raw.message }
  if (
    raw.type === 'resource' &&
    'id' in raw &&
    validId(raw.id) &&
    'name' in raw &&
    isPythonBootResourceName(raw.name) &&
    'bytes' in raw &&
    raw.bytes instanceof ArrayBuffer &&
    raw.bytes.byteLength > 0 &&
    raw.bytes.byteLength <= PYTHON_BOOT_LIMITS.fileBytes &&
    exactKeys(raw, ['protocol', 'type', 'id', 'name', 'bytes'])
  )
    return { protocol: 1, type: 'resource', id: raw.id, name: raw.name, bytes: raw.bytes }
  return null
}
