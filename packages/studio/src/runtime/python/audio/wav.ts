import { STUDIO_PYTHON_MATERIAL_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import { PYTHON_AUDIO_LIMITS } from './contract'

export interface PythonAudioWav {
  channels: 1 | 2
  sampleRate: number
  frames: number
  durationSeconds: number
}

function invalid(): never {
  throw new Error('Use um WAV PCM16 mono ou estéreo válido, dentro dos limites de áudio Python.')
}

/** Inspect RIFF structure and PCM budgets without decoding or copying media bytes. */
export function readPythonAudioWav(input: unknown): PythonAudioWav {
  if (
    !(input instanceof Uint8Array) ||
    !(input.buffer instanceof ArrayBuffer) ||
    input.byteLength < 44 ||
    input.byteLength > STUDIO_PYTHON_MATERIAL_LIMITS.audioBytes ||
    input.byteLength > PYTHON_AUDIO_LIMITS.fileBytes
  )
    invalid()
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  if (
    view.getUint32(0) !== 0x52494646 || // RIFF
    view.getUint32(8) !== 0x57415645 || // WAVE
    view.getUint32(4, true) !== input.byteLength - 8
  )
    invalid()
  let cursor = 12
  let chunks = 0
  let format: { channels: 1 | 2; sampleRate: number; blockAlign: number } | undefined
  let dataBytes: number | undefined
  while (cursor < input.byteLength) {
    if (++chunks > PYTHON_AUDIO_LIMITS.wavChunks || cursor + 8 > input.byteLength) invalid()
    const tag = view.getUint32(cursor)
    const size = view.getUint32(cursor + 4, true)
    const body = cursor + 8
    const next = body + size + (size % 2)
    if (next > input.byteLength) invalid()
    if (tag === 0x666d7420) {
      // fmt : PCM only; do not pass compressed/expanding content to a native decoder.
      if (format || size < 16 || view.getUint16(body, true) !== 1) invalid()
      const channels = view.getUint16(body + 2, true)
      const sampleRate = view.getUint32(body + 4, true)
      const byteRate = view.getUint32(body + 8, true)
      const blockAlign = view.getUint16(body + 12, true)
      if (
        (channels !== 1 && channels !== 2) ||
        sampleRate < PYTHON_AUDIO_LIMITS.minimumSampleRate ||
        sampleRate > PYTHON_AUDIO_LIMITS.maximumSampleRate ||
        view.getUint16(body + 14, true) !== 16 ||
        blockAlign !== channels * 2 ||
        byteRate !== sampleRate * blockAlign
      )
        invalid()
      format = { channels, sampleRate, blockAlign }
    } else if (tag === 0x64617461) {
      // Exactly one nonempty data chunk. Metadata chunks never become audio samples.
      if (dataBytes !== undefined || !size) invalid()
      dataBytes = size
    }
    cursor = next
  }
  if (!format || dataBytes === undefined || dataBytes % format.blockAlign !== 0) invalid()
  const frames = dataBytes / format.blockAlign
  const durationSeconds = frames / format.sampleRate
  if (durationSeconds > PYTHON_AUDIO_LIMITS.durationSeconds) invalid()
  return { channels: format.channels, sampleRate: format.sampleRate, frames, durationSeconds }
}
