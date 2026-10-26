import { isStudioPythonAssetPath } from '@sistemazero/core/studio/project-environment'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import { isToneRequest } from './tone'

/** Independent of Turtle and the historical JavaScript audio implementation. */
export const PYTHON_AUDIO_LIMITS = SZ_AUDIO_MODULE_DESCRIPTOR.audio.policy

/** Pygame Zero's music has its own channel: at most this many music voices at once. */
export const PYTHON_MUSIC_VOICES = 2
/** Sound.play(loops=N): the extra plays one request may ask for. */
export const PYTHON_AUDIO_REPEATS = 1000
/** Voices one stop or volume request may name. */
export const PYTHON_AUDIO_BATCH = 64

export type PythonAudioRequest =
  | {
      version: 1
      op: 'play'
      id: number
      /** A sound of the project... */
      path?: string
      /** ...or a note of Pygame Zero's tone module, built by the host (exactly one of them). */
      tone?: { hz: number; samples: number }
      loop: boolean
      volume: number
      /** Extra plays after the first, without a gap (pygame's loops=N). */
      repeat?: number
      /** Pygame Zero's music: its own channel, outside the limit of simultaneous sounds. */
      music?: boolean
    }
  | { version: 1; op: 'stop'; id: number | null }
  | { version: 1; op: 'stop'; ids: number[] }
  | { version: 1; op: 'volume'; id: number; volume: number }
  | { version: 1; op: 'volume'; ids: number[]; volume: number }
  /** Pygame Zero's music.pause()/unpause(): the track keeps its place and does not end. */
  | { version: 1; op: 'pause' | 'resume'; id: number }
  /** Pygame-ce's mixer.pause()/unpause(): every channel at once. */
  | { version: 1; op: 'pause' | 'resume'; ids: number[] }
  /** Nothing to do: only collects the sounds that ended (Pygame Zero waits for them). */
  | { version: 1; op: 'poll' }

/** WAV for sz_audio and sound effects; MP3/OGG for Pygame Zero's music folder. */
export const PYTHON_AUDIO_EXTENSIONS = ['.wav', '.ogg', '.oga', '.mp3'] as const
export function pythonAudioMediaType(path: string) {
  const lower = path.toLowerCase()
  return lower.endsWith('.wav')
    ? 'audio/wav'
    : lower.endsWith('.mp3')
      ? 'audio/mpeg'
      : lower.endsWith('.ogg') || lower.endsWith('.oga')
        ? 'audio/ogg'
        : undefined
}

const identifier = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const identifiers = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= PYTHON_AUDIO_BATCH &&
  value.every(identifier)
const volumeValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

function invalid(): never {
  throw new Error('Pedido de áudio Python inválido ou acima do limite.')
}

/** Data only. Session ownership and asset membership must also be checked by the media service. */
function toneValue(value: unknown) {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 2 &&
    isToneRequest((value as { hz?: unknown }).hz, (value as { samples?: unknown }).samples)
  )
}

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
  if (request.op === 'poll') {
    if (Object.keys(request).some((key) => !['version', 'op'].includes(key))) invalid()
    return { version: 1, op: 'poll' }
  }
  if (request.op === 'pause' || request.op === 'resume') {
    if ('ids' in request) {
      if (
        Object.keys(request).some((key) => !['version', 'op', 'ids'].includes(key)) ||
        !identifiers(request.ids)
      )
        invalid()
      return { version: 1, op: request.op, ids: request.ids }
    }
    if (
      Object.keys(request).some((key) => !['version', 'op', 'id'].includes(key)) ||
      !identifier(request.id)
    )
      invalid()
    return { version: 1, op: request.op, id: request.id }
  }
  if (request.op === 'volume') {
    if ('ids' in request) {
      if (
        Object.keys(request).some((key) => !['version', 'op', 'ids', 'volume'].includes(key)) ||
        !identifiers(request.ids) ||
        !volumeValue(request.volume)
      )
        invalid()
      return { version: 1, op: 'volume', ids: request.ids, volume: request.volume }
    }
    if (
      Object.keys(request).some((key) => !['version', 'op', 'id', 'volume'].includes(key)) ||
      !identifier(request.id) ||
      !volumeValue(request.volume)
    )
      invalid()
    return { version: 1, op: 'volume', id: request.id, volume: request.volume }
  }
  if (request.op === 'stop') {
    if ('ids' in request) {
      if (
        Object.keys(request).some((key) => !['version', 'op', 'ids'].includes(key)) ||
        !identifiers(request.ids)
      )
        invalid()
      return { version: 1, op: 'stop', ids: request.ids }
    }
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
      (key) =>
        !['version', 'op', 'id', 'path', 'tone', 'loop', 'volume', 'repeat', 'music'].includes(key),
    ) ||
    !identifier(request.id) ||
    (request.tone === undefined
      ? typeof request.path !== 'string' ||
        !isStudioPythonAssetPath(request.path) ||
        !pythonAudioMediaType(request.path)
      : request.path !== undefined || !toneValue(request.tone) || request.music !== undefined) ||
    typeof request.loop !== 'boolean' ||
    !volumeValue(request.volume) ||
    (request.repeat !== undefined &&
      (typeof request.repeat !== 'number' ||
        !Number.isSafeInteger(request.repeat) ||
        request.repeat < 1 ||
        request.repeat > PYTHON_AUDIO_REPEATS ||
        request.loop)) ||
    (request.music !== undefined && request.music !== true)
  )
    invalid()
  return {
    version: 1,
    op: 'play',
    id: request.id,
    ...(request.tone === undefined
      ? { path: request.path as string }
      : {
          tone: {
            hz: (request.tone as { hz: number }).hz,
            samples: (request.tone as { samples: number }).samples,
          },
        }),
    loop: request.loop,
    volume: request.volume,
    ...(request.repeat !== undefined ? { repeat: request.repeat } : {}),
    ...(request.music ? { music: true } : {}),
  }
}
