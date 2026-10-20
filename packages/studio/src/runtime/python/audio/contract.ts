import { isStudioPythonAssetPath } from '@sistemazero/core/studio/project-environment'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'

/** Independent of Turtle and the historical JavaScript audio implementation. */
export const PYTHON_AUDIO_LIMITS = SZ_AUDIO_MODULE_DESCRIPTOR.audio.policy

export type PythonAudioRequest =
  | { version: 1; op: 'play'; id: number; path: string; loop: boolean; volume: number }
  | { version: 1; op: 'stop'; id: number | null }

const identifier = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

function invalid(): never {
  throw new Error('Pedido de áudio Python inválido ou acima do limite.')
}

/** Data only. Session ownership and asset membership must also be checked by the media service. */
export function readPythonAudioRequest(raw: unknown): PythonAudioRequest {
  if (
    typeof raw !== 'string' ||
    raw.length > PYTHON_AUDIO_LIMITS.requestBytes ||
    new TextEncoder().encode(raw).byteLength > PYTHON_AUDIO_LIMITS.requestBytes
  )
    invalid()
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    invalid()
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  const request = value as Record<string, unknown>
  if (request.version !== 1) invalid()
  if (request.op === 'stop') {
    if (
      Object.keys(request).some((key) => !['version', 'op', 'id'].includes(key)) ||
      (request.id !== null && !identifier(request.id))
    )
      invalid()
    return { version: 1, op: 'stop', id: request.id }
  }
  if (
    request.op !== 'play' ||
    Object.keys(request).some(
      (key) => !['version', 'op', 'id', 'path', 'loop', 'volume'].includes(key),
    ) ||
    !identifier(request.id) ||
    typeof request.path !== 'string' ||
    !isStudioPythonAssetPath(request.path) ||
    !request.path.toLowerCase().endsWith('.wav') ||
    typeof request.loop !== 'boolean' ||
    typeof request.volume !== 'number' ||
    !Number.isFinite(request.volume) ||
    request.volume < 0 ||
    request.volume > 1
  )
    invalid()
  return {
    version: 1,
    op: 'play',
    id: request.id,
    path: request.path,
    loop: request.loop,
    volume: request.volume,
  }
}
