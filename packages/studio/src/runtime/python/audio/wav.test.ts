import { describe, expect, test } from 'bun:test'
import { readPythonAudioWav as read } from './wav'

function chunk(name: string, body: Uint8Array) {
  const bytes = new Uint8Array(8 + body.length + (body.length % 2))
  bytes.set(new TextEncoder().encode(name))
  new DataView(bytes.buffer).setUint32(4, body.length, true)
  bytes.set(body, 8)
  return bytes
}
function format(channels = 1, rate = 8000) {
  const bytes = new Uint8Array(16)
  const view = new DataView(bytes.buffer)
  view.setUint16(0, 1, true)
  view.setUint16(2, channels, true)
  view.setUint32(4, rate, true)
  view.setUint32(8, rate * channels * 2, true)
  view.setUint16(12, channels * 2, true)
  view.setUint16(14, 16, true)
  return bytes
}
function riff(chunks: Uint8Array[]) {
  const bytes = new Uint8Array(12 + chunks.reduce((n, value) => n + value.length, 0))
  bytes.set(new TextEncoder().encode('RIFF'))
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true)
  bytes.set(new TextEncoder().encode('WAVE'), 8)
  let offset = 12
  for (const value of chunks) {
    bytes.set(value, offset)
    offset += value.length
  }
  return bytes
}
const sample = () => riff([chunk('fmt ', format()), chunk('data', new Uint8Array(16000))])

describe('bounded WAV inspection before native playback', () => {
  test('inspects PCM16 duration without decoding or changing the payload', () => {
    const wav = sample()
    const before = wav.slice()
    expect(read(wav)).toEqual({ channels: 1, sampleRate: 8000, frames: 8000, durationSeconds: 1 })
    expect(wav).toEqual(before)
    const storage = new Uint8Array(wav.length + 20)
    storage.set(wav, 7)
    expect(read(storage.subarray(7, 7 + wav.length))).toEqual(read(wav))
  })

  test('supports corpus sample rates and skips odd metadata chunks with their padding', () => {
    for (const sampleRate of [44100, 48000, 96000]) {
      const bytes = riff([
        chunk('JUNK', new Uint8Array([1, 2, 3])),
        chunk('fmt ', format(2, sampleRate)),
        chunk('data', new Uint8Array(400)),
        chunk('LIST', new Uint8Array([4])),
      ])
      expect(read(bytes)).toEqual({
        channels: 2,
        sampleRate,
        frames: 100,
        durationSeconds: 100 / sampleRate,
      })
    }
  })

  test('rejects truncated containers, forged chunk sizes and duplicate/missing payloads', () => {
    const bytes = sample()
    for (const truncated of [bytes.subarray(0, 4), bytes.subarray(0, 43), bytes.subarray(0, -1)])
      expect(() => read(truncated)).toThrow()
    const forged = bytes.slice()
    new DataView(forged.buffer).setUint32(40, 0xffffffff, true)
    expect(() => read(forged)).toThrow()
    for (const chunks of [
      [chunk('fmt ', format())],
      [chunk('data', new Uint8Array(2))],
      [chunk('fmt ', format()), chunk('fmt ', format()), chunk('data', new Uint8Array(2))],
      [chunk('fmt ', format()), chunk('data', new Uint8Array(2)), chunk('data', new Uint8Array(2))],
    ])
      expect(() => read(riff(chunks))).toThrow()
    const wrongMagic = bytes.slice()
    wrongMagic[0] = 0
    expect(() => read(wrongMagic)).toThrow()
    expect(() => read(new Uint8Array(32 * 1024 * 1024 + 1))).toThrow()
  })

  test('rejects unsupported codecs, false byte rates and inconsistent frame sizes', () => {
    for (const [offset, value, width] of [
      [0, 3, 2],
      [2, 3, 2],
      [4, 96001, 4],
      [8, 1, 4],
      [12, 1, 2],
      [14, 8, 2],
    ]) {
      const fmt = format()
      const view = new DataView(fmt.buffer)
      if (width === 2) view.setUint16(offset!, value!, true)
      else view.setUint32(offset!, value!, true)
      expect(() => read(riff([chunk('fmt ', fmt), chunk('data', new Uint8Array(2))]))).toThrow()
    }
    for (const size of [0, 3])
      expect(() =>
        read(riff([chunk('fmt ', format()), chunk('data', new Uint8Array(size))])),
      ).toThrow()
  })

  test('bounds duration and metadata work independently of file byte limit', () => {
    const long = riff([chunk('fmt ', format()), chunk('data', new Uint8Array(8000 * 2 * 601))])
    expect(() => read(long)).toThrow()
    const chunks = Array.from({ length: 257 }, () => chunk('JUNK', new Uint8Array()))
    expect(() =>
      read(riff([...chunks, chunk('fmt ', format()), chunk('data', new Uint8Array(2))])),
    ).toThrow()
  })
})
