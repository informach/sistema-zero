/**
 * The notes of Pygame Zero's `tone` module, synthesized in the browser.
 *
 * Same recipe as pgzero 1.2.1 (`tone._create`): one sine cycle at the note's frequency, repeated,
 * shaped by its fixed ADSR envelope, 16-bit at 22050 Hz. Only the frequency and the number of
 * samples travel from Python; the sound is built here and kept for the next time.
 */

export const TONE_SAMPLE_RATE = 22050
/** Samples of fade-out after the note (pgzero's DECAY). */
export const TONE_DECAY = 2000
/** Longest note the Studio builds: 10 seconds (pgzero's play() allows 4; create() more). */
export const TONE_MAX_SAMPLES = 10 * TONE_SAMPLE_RATE
// Like pgzero 1.2.1: any positive frequency up to the sample rate (above half of it the
// note comes out as silence, as on the computer).
export const TONE_MIN_HZ = 0
export const TONE_MAX_HZ = TONE_SAMPLE_RATE

export function isToneRequest(hz: unknown, samples: unknown): boolean {
  return (
    typeof hz === 'number' &&
    Number.isFinite(hz) &&
    hz > TONE_MIN_HZ &&
    hz <= TONE_MAX_HZ &&
    typeof samples === 'number' &&
    Number.isSafeInteger(samples) &&
    samples >= 1 &&
    samples <= TONE_MAX_SAMPLES
  )
}

/** numpy.interp over increasing points, with its own arithmetic (slope * (x - xp[j]) + fp[j]). */
function envelope(at: number, times: readonly number[], volumes: readonly number[]) {
  const last = times.length - 1
  if (at <= times[0]!) return volumes[0]!
  if (at >= times[last]!) return volumes[last]!
  let j = 0
  while (j < last - 1 && times[j + 1]! <= at) j++
  const t0 = times[j]!
  const t1 = times[j + 1]!
  if (t1 === t0) return volumes[j + 1]!
  const slope = (volumes[j + 1]! - volumes[j]!) / (t1 - t0)
  return slope * (at - t0) + volumes[j]!
}

/** The note's 16-bit samples, as pgzero builds them (before its mono → stereo copy). */
export function toneSamples(hz: number, samples: number): Int16Array {
  if (!isToneRequest(hz, samples)) throw new Error('Nota do tone inválida.')
  const end = samples + TONE_DECAY
  const length = TONE_SAMPLE_RATE / hz
  const cycleLength = Math.max(1, Math.trunc(length))
  const omega = (Math.PI * 2) / length
  const cycle = new Int16Array(cycleLength)
  // numpy: (np.sin(x) * 2**15).astype(np.int16) — truncation, wrapping like int16.
  for (let i = 0; i < cycleLength; i++) cycle[i] = Math.trunc(Math.sin(i * omega) * 32768)
  const [times, volumes] =
    samples < 1000
      ? [
          [0, samples * 0.1, samples, end],
          [0, 1, 0.9, 0],
        ]
      : [
          [0, 350, 1000, samples, end],
          [0, 1.0, 0.7, 0.7, 0],
        ]
  const out = new Int16Array(end)
  for (let i = 0; i < end; i++)
    // np.multiply(tone, adsr, out=tone, casting='unsafe'): float product truncated to int16.
    out[i] = Math.trunc(cycle[i % cycleLength]! * envelope(i, times, volumes))
  return out
}

/** A mono 16-bit WAV file with the note. */
export function toneWav(hz: number, samples: number): Uint8Array<ArrayBuffer> {
  const pcm = toneSamples(hz, samples)
  const bytes = new Uint8Array(44 + pcm.byteLength)
  const view = new DataView(bytes.buffer)
  const ascii = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++) bytes[at + i] = text.charCodeAt(i)
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + pcm.byteLength, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TONE_SAMPLE_RATE, true)
  view.setUint32(28, TONE_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, pcm.byteLength, true)
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i]!, true)
  return bytes
}
