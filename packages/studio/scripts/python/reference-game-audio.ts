/** Original procedural PCM16 sounds. Integer oscillators keep generation reproducible. */
export interface ReferenceSound {
  game: 'pacman-visual' | 'space-arena-visual'
  path: string
  notes: readonly number[]
  noteMilliseconds: number
  noise?: boolean
}

export const REFERENCE_GAME_SOUNDS: readonly ReferenceSound[] = [
  {
    game: 'pacman-visual',
    path: 'opening.wav',
    notes: [262, 330, 392, 523],
    noteMilliseconds: 120,
  },
  { game: 'pacman-visual', path: 'collect.wav', notes: [660, 880], noteMilliseconds: 40 },
  { game: 'pacman-visual', path: 'power.wav', notes: [392, 523, 659], noteMilliseconds: 90 },
  { game: 'pacman-visual', path: 'collision.wav', notes: [330, 220, 110], noteMilliseconds: 110 },
  {
    game: 'space-arena-visual',
    path: 'bgm.wav',
    notes: [131, 196, 262, 196, 147, 220, 294, 220, 165, 247, 330, 247, 147, 220, 294, 196],
    noteMilliseconds: 250,
  },
  {
    game: 'space-arena-visual',
    path: 'explosion.wav',
    notes: [100, 70, 40],
    noteMilliseconds: 90,
    noise: true,
  },
  {
    game: 'space-arena-visual',
    path: 'missile_fire.wav',
    notes: [1200, 800, 400],
    noteMilliseconds: 35,
  },
  {
    game: 'space-arena-visual',
    path: 'powerup.wav',
    notes: [440, 554, 659, 880],
    noteMilliseconds: 70,
  },
  {
    game: 'space-arena-visual',
    path: 'thruster.wav',
    notes: [65, 66, 65, 64],
    noteMilliseconds: 75,
    noise: true,
  },
]

export function renderReferenceSound(sound: ReferenceSound): Uint8Array {
  if (
    !sound.notes.length ||
    sound.notes.some(
      (frequency) => !Number.isSafeInteger(frequency) || frequency < 20 || frequency > 8000,
    ) ||
    !Number.isSafeInteger(sound.noteMilliseconds) ||
    sound.noteMilliseconds < 10 ||
    sound.noteMilliseconds > 1000
  )
    throw new Error('A partitura precisa de frequências e durações inteiras válidas.')
  const sampleRate = 22050
  const perNote = Math.floor((sampleRate * sound.noteMilliseconds) / 1000)
  const sampleCount = perNote * sound.notes.length
  const bytes = Buffer.alloc(44 + sampleCount * 2)
  bytes.write('RIFF', 0)
  bytes.writeUInt32LE(bytes.length - 8, 4)
  bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16)
  bytes.writeUInt16LE(1, 20)
  bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(sampleRate, 24)
  bytes.writeUInt32LE(sampleRate * 2, 28)
  bytes.writeUInt16LE(2, 32)
  bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36)
  bytes.writeUInt32LE(sampleCount * 2, 40)
  let phase = 0
  let randomState = 20261022
  for (let sample = 0; sample < sampleCount; sample++) {
    const position = sample % perNote
    const frequency = sound.notes[Math.floor(sample / perNote)]!
    phase = (phase + frequency) % sampleRate
    const ramp = Math.floor((phase * 32768) / sampleRate)
    const triangle = ramp < 16384 ? ramp * 2 - 16384 : 49152 - ramp * 2
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0
    const wave = sound.noise
      ? Math.trunc((triangle + ((randomState >>> 16) - 32768)) / 2)
      : triangle
    const envelope = Math.min(position, perNote - position - 1, 128)
    const value = Math.trunc((wave * envelope) / 512)
    bytes.writeInt16LE(value, 44 + sample * 2)
  }
  return new Uint8Array(bytes)
}
