/**
 * Original sound effects and chiptune music for the Pygame-ce gallery, made from code: no sample
 * from the reference projects is used. Deterministic (seeded noise), 22050 Hz mono PCM16; music
 * becomes OGG Vorbis through ffmpeg (FFMPEG env var or PATH), like the Pygame Zero gallery.
 */
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const SAMPLE_RATE = 22050

function wav(samples: Float32Array): Uint8Array {
  const bytes = Buffer.alloc(44 + samples.length * 2)
  bytes.write('RIFF', 0)
  bytes.writeUInt32LE(bytes.length - 8, 4)
  bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16)
  bytes.writeUInt16LE(1, 20)
  bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(SAMPLE_RATE, 24)
  bytes.writeUInt32LE(SAMPLE_RATE * 2, 28)
  bytes.writeUInt16LE(2, 32)
  bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36)
  bytes.writeUInt32LE(samples.length * 2, 40)
  for (let index = 0; index < samples.length; index++)
    bytes.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[index]!)) * 32767),
      44 + index * 2,
    )
  return new Uint8Array(bytes)
}

function noiseSource(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2147483648 - 1
  }
}

type Wave = 'square' | 'triangle' | 'saw' | 'sine' | 'noise' | 'pulse'
const oscillator = (wave: Wave, phase: number, noise: () => number) => {
  const t = phase - Math.floor(phase)
  switch (wave) {
    case 'square':
      return t < 0.5 ? 1 : -1
    case 'pulse':
      return t < 0.25 ? 1 : -1
    case 'triangle':
      return t < 0.5 ? 4 * t - 1 : 3 - 4 * t
    case 'saw':
      return 2 * t - 1
    case 'sine':
      return Math.sin(2 * Math.PI * t)
    case 'noise':
      return noise()
  }
}

export interface Tone {
  wave: Wave
  /** Frequency at the start and at the end (glide), Hz. */
  from: number
  to?: number
  ms: number
  volume?: number
  /** Attack and release, ms. */
  attack?: number
  release?: number
  /** Start time inside the sound, ms. */
  at?: number
  /** Vibrato depth (fraction of the frequency) and rate (Hz). */
  vibrato?: [number, number]
  /** One-pole low-pass (0..1, lower = darker) — for explosions. */
  lowpass?: number
  seed?: number
}

/** Mix tones into one buffer. */
export function render(tones: Tone[], totalMs?: number): Float32Array {
  const end = totalMs ?? Math.max(...tones.map((tone) => (tone.at ?? 0) + tone.ms))
  const out = new Float32Array(Math.ceil((end / 1000) * SAMPLE_RATE))
  for (const tone of tones) {
    const noise = noiseSource(tone.seed ?? 20261025)
    const start = Math.floor(((tone.at ?? 0) / 1000) * SAMPLE_RATE)
    const length = Math.floor((tone.ms / 1000) * SAMPLE_RATE)
    const attack = Math.max(1, Math.floor(((tone.attack ?? 4) / 1000) * SAMPLE_RATE))
    const release = Math.max(1, Math.floor(((tone.release ?? tone.ms * 0.6) / 1000) * SAMPLE_RATE))
    let phase = 0
    let filtered = 0
    let held = 0
    for (let index = 0; index < length && start + index < out.length; index++) {
      const progress = index / length
      let frequency = tone.from + ((tone.to ?? tone.from) - tone.from) * progress
      if (tone.vibrato)
        frequency *=
          1 + tone.vibrato[0] * Math.sin((2 * Math.PI * tone.vibrato[1] * index) / SAMPLE_RATE)
      phase += frequency / SAMPLE_RATE
      let value: number
      if (tone.wave === 'noise') {
        // Sample-and-hold noise: its "pitch" is how often it changes.
        if (phase >= 1) {
          phase -= Math.floor(phase)
          held = noise()
        }
        value = held
      } else value = oscillator(tone.wave, phase, noise)
      if (tone.lowpass !== undefined) {
        filtered += (value - filtered) * tone.lowpass
        value = filtered
      }
      const envelope = Math.min(1, index / attack, (length - index) / release)
      out[start + index] = (out[start + index] ?? 0) + value * envelope * (tone.volume ?? 0.4)
    }
  }
  return out
}

export const soundWav = (tones: Tone[], totalMs?: number) => wav(render(tones, totalMs))

// Music ----------------------------------------------------------------------------------------

const NOTE = /^([A-G])(#|b)?(\d)$/
const SEMITONE: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }

/** "A4" → 440 Hz; "-" is a rest. */
export function frequency(note: string): number {
  const match = NOTE.exec(note)
  if (!match) throw new Error(`nota inválida: ${note}`)
  const semitone = SEMITONE[match[1]!]! + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0)
  return 440 * 2 ** ((semitone + (Number(match[3]) - 4) * 12) / 12)
}

export interface Track {
  wave: Wave
  /**
   * Space-separated steps: a note ("C4"), "C4~" to hold the C4 of the step before (or to start a
   * held C4 after a rest or another note), or "-" for a rest.
   */
  steps: string
  volume: number
  vibrato?: [number, number]
  /** Fraction of the step the note sounds (staccato < 1). */
  gate?: number
}
export interface Song {
  bpm: number
  /** Steps per beat (4 = sixteenth notes). */
  division: number
  tracks: Track[]
  /** Drum steps: "k" kick, "s" snare, "h" hat, "-" rest. */
  drums?: string
  drumVolume?: number
  repeat?: number
}

export function songWav(song: Song): Uint8Array {
  const stepMs = 60000 / song.bpm / song.division
  const tones: Tone[] = []
  let totalSteps = 0
  for (let round = 0; round < (song.repeat ?? 1); round++) {
    let longest = 0
    for (const track of song.tracks) {
      const steps = track.steps.trim().split(/\s+/)
      longest = Math.max(longest, steps.length)
      const pitch = (step: string) => step.replace(/~$/, '')
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index]!
        if (step === '-') continue
        // "C4~" holds the C4 just before it; after a rest or another note it starts a held C4.
        if (step.endsWith('~') && index > 0 && pitch(steps[index - 1]!) === pitch(step)) continue
        let length = 1
        while (steps[index + length] === `${pitch(step)}~`) length++
        tones.push({
          wave: track.wave,
          from: frequency(pitch(step)),
          ms: stepMs * length * (track.gate ?? 0.92),
          at: (totalSteps + index) * stepMs,
          volume: track.volume,
          attack: 3,
          release: Math.min(60, stepMs * length * 0.4),
          ...(track.vibrato ? { vibrato: track.vibrato } : {}),
        })
      }
    }
    if (song.drums) {
      const steps = song.drums.trim().split(/\s+/)
      longest = Math.max(longest, steps.length)
      steps.forEach((step, index) => {
        const at = (totalSteps + index) * stepMs
        const volume = song.drumVolume ?? 0.35
        if (step.includes('k'))
          tones.push({
            wave: 'sine',
            from: 140,
            to: 45,
            ms: 140,
            at,
            volume: volume * 1.4,
            release: 120,
          })
        if (step.includes('s'))
          tones.push({
            wave: 'noise',
            from: 9000,
            ms: 120,
            at,
            volume: volume * 0.8,
            release: 110,
            lowpass: 0.6,
            seed: index + 3,
          })
        if (step.includes('h'))
          tones.push({
            wave: 'noise',
            from: 16000,
            ms: 35,
            at,
            volume: volume * 0.35,
            release: 30,
            seed: index + 11,
          })
      })
    }
    totalSteps += longest
  }
  return wav(render(tones, totalSteps * stepMs))
}

/** WAV → OGG Vorbis. Requires ffmpeg with libvorbis. */
export async function encodeOgg(wavBytes: Uint8Array): Promise<Uint8Array> {
  const folder = await mkdtemp(join(tmpdir(), 'sz-pygame-audio-'))
  try {
    await writeFile(join(folder, 'in.wav'), wavBytes)
    const result = spawnSync(
      process.env.FFMPEG ?? 'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        join(folder, 'in.wav'),
        '-map_metadata',
        '-1',
        '-fflags',
        '+bitexact',
        '-c:a',
        'libvorbis',
        '-q:a',
        '3',
        join(folder, 'out.ogg'),
      ],
      { encoding: 'utf8' },
    )
    if (result.status !== 0) throw new Error(`ffmpeg falhou: ${result.stderr || result.error}`)
    return new Uint8Array(await readFile(join(folder, 'out.ogg')))
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}

// A small library of effects the games share (each game can still write its own).
export const SOUNDS = {
  laser: () =>
    soundWav([
      { wave: 'square', from: 1400, to: 300, ms: 160, volume: 0.25, release: 120 },
      { wave: 'triangle', from: 700, to: 200, ms: 160, volume: 0.2 },
    ]),
  explosion: (seed = 7) =>
    soundWav([
      {
        wave: 'noise',
        from: 3000,
        to: 400,
        ms: 650,
        volume: 0.6,
        release: 600,
        lowpass: 0.25,
        seed,
      },
      { wave: 'sine', from: 90, to: 35, ms: 400, volume: 0.5, release: 380 },
    ]),
  damage: () =>
    soundWav([
      { wave: 'square', from: 220, to: 80, ms: 300, volume: 0.3, release: 250 },
      { wave: 'noise', from: 5000, ms: 200, volume: 0.35, release: 190, lowpass: 0.4, seed: 5 },
    ]),
  coin: () =>
    soundWav([
      { wave: 'square', from: 988, ms: 70, volume: 0.25 },
      { wave: 'square', from: 1319, ms: 220, at: 70, volume: 0.25, release: 200 },
    ]),
  jump: () =>
    soundWav([{ wave: 'square', from: 260, to: 720, ms: 180, volume: 0.22, release: 120 }]),
  hit: () =>
    soundWav([
      { wave: 'noise', from: 7000, ms: 90, volume: 0.45, release: 80, lowpass: 0.5, seed: 9 },
      { wave: 'square', from: 180, to: 90, ms: 90, volume: 0.25 },
    ]),
  select: () => soundWav([{ wave: 'pulse', from: 660, ms: 60, volume: 0.2 }]),
  confirm: () =>
    soundWav([
      { wave: 'pulse', from: 523, ms: 70, volume: 0.22 },
      { wave: 'pulse', from: 784, ms: 120, at: 70, volume: 0.22 },
    ]),
  heal: () =>
    soundWav(
      [523, 659, 784, 1047].map((from, index) => ({
        wave: 'triangle' as const,
        from,
        ms: 110,
        at: index * 80,
        volume: 0.3,
      })),
    ),
  powerup: () =>
    soundWav([{ wave: 'square', from: 300, to: 1200, ms: 400, volume: 0.2, vibrato: [0.06, 18] }]),
  shoot: () =>
    soundWav([
      {
        wave: 'noise',
        from: 6000,
        to: 1500,
        ms: 140,
        volume: 0.4,
        lowpass: 0.5,
        release: 120,
        seed: 13,
      },
      { wave: 'square', from: 400, to: 120, ms: 100, volume: 0.2 },
    ]),
  step: () =>
    soundWav([
      { wave: 'noise', from: 2500, ms: 50, volume: 0.25, lowpass: 0.3, release: 45, seed: 21 },
    ]),
} as const
