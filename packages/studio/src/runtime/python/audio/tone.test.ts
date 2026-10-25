import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { TONE_DECAY, toneSamples, toneWav } from './tone'

// Measured on pgzero 1.2.1 + numpy 2.5.4: the samples tone._create builds before its stereo
// copy (the same int16 values), as SHA-256 of their little-endian bytes.
const REFERENCE = [
  ['A4', 440.0, 11025, '614627a30abb723b35223d030b740452716e434cb2f3198f7d173dacf627c63c'],
  [
    'C4',
    261.6255653005985,
    441,
    '49c98f3d9c8128ee5eba1522c860a7326c45d4e278475b3e6bf5a4b03092bfc0',
  ],
  [
    'F#5',
    739.988845423269,
    22050,
    '848e45e6b9dc32c5051caa0c249a174379571293716ddeae6370551b60605c8c',
  ],
  ['220 Hz', 220.0, 5512, '8897b0e5a0c5af5d7efe88fc4e93002a0229b0253cf590327b3622be7ee8c5ab'],
  [
    'Bb2',
    116.54094037952237,
    2205,
    '01259c423ea45e232dfd49e9bdd006cb5bc5c343d8a5fddd002728cf0aa139a8',
  ],
] as const

for (const [note, hz, samples, sha256] of REFERENCE)
  test(`the note ${note} has exactly the samples of the desktop Pygame Zero`, () => {
    const pcm = toneSamples(hz, samples)
    expect(pcm.length).toBe(samples + TONE_DECAY)
    const digest = createHash('sha256')
      .update(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength))
      .digest('hex')
    expect(digest).toBe(sha256)
  })

test('the WAV is mono 16-bit at 22050 Hz with the samples after its 44-byte header', () => {
  const wav = toneWav(440, 1000)
  const view = new DataView(wav.buffer)
  expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe('RIFF')
  expect(view.getUint16(22, true)).toBe(1)
  expect(view.getUint32(24, true)).toBe(22050)
  expect(view.getUint32(40, true)).toBe((1000 + TONE_DECAY) * 2)
})

test('notes out of range are refused', () => {
  expect(() => toneSamples(0, 100)).toThrow()
  expect(() => toneSamples(440, 0)).toThrow()
  expect(() => toneSamples(440, 10 * 22050 + 1)).toThrow()
})
