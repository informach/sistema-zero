import { describe, expect, test } from 'bun:test'
import { readPythonAudioRequest as read } from './contract'

const play = {
  version: 1,
  op: 'play',
  id: 1,
  path: 'assets/start.wav',
  loop: false,
  volume: 0.8,
} as const

describe('Python portable audio wire boundary', () => {
  test('accepts bounded data, including root-level corpus paths and stop-all', () => {
    expect(read(JSON.stringify(play))).toEqual(play)
    expect(read(JSON.stringify({ ...play, path: 'bgm.wav', loop: true }))).toEqual({
      ...play,
      path: 'bgm.wav',
      loop: true,
    })
    for (const id of [1, null])
      expect(read(JSON.stringify({ version: 1, op: 'stop', id }))).toEqual({
        version: 1,
        op: 'stop',
        id,
      })
  })

  test('accepts WAV, MP3 and OGG (Pygame Zero music) and the volume command', () => {
    for (const path of ['music/tema.mp3', 'music/tema.ogg', 'music/tema.oga', 'sounds/pulo.wav'])
      expect(read(JSON.stringify({ ...play, path })).op).toBe('play')
    expect(read(JSON.stringify({ version: 1, op: 'volume', id: 3, volume: 0.5 }))).toEqual({
      version: 1,
      op: 'volume',
      id: 3,
      volume: 0.5,
    })
    for (const volume of [-0.1, 1.5, null])
      expect(() => read(JSON.stringify({ version: 1, op: 'volume', id: 3, volume }))).toThrow()
  })

  test('rejects URLs, traversal, unknown audio formats and executable options', () => {
    for (const path of [
      '../eat.wav',
      'assets/../eat.wav',
      '/eat.wav',
      'https://example.test/eat.wav',
      'data:audio/wav;base64,AAAA',
      'C:\\eat.wav',
      'assets\\eat.wav',
      'eat.wav?x=1',
      'main.py',
      'assets/início.wav',
      '.private/eat.wav',
      'eat.flac',
      'eat.wav/child',
    ])
      expect(() => read(JSON.stringify({ ...play, path }))).toThrow()
    expect(() => read(JSON.stringify({ ...play, onended: 'alert(1)' }))).toThrow()
    expect(() => read(JSON.stringify({ version: 1, op: 'eval', source: 'alert(1)' }))).toThrow()
  })

  test('rejects invalid identifiers, levels, booleans, versions and envelopes', () => {
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, null, true, '1'])
      expect(() => read(JSON.stringify({ ...play, id }))).toThrow()
    for (const volume of [-0.1, 1.1, null, true, '0.8', Number.POSITIVE_INFINITY])
      expect(() => read(JSON.stringify({ ...play, volume }))).toThrow()
    for (const loop of [0, 1, null, 'false'])
      expect(() => read(JSON.stringify({ ...play, loop }))).toThrow()
    for (const value of [null, {}, [], 1, 'bad json', JSON.stringify({ ...play, version: 2 })])
      expect(() => read(value)).toThrow()
    expect(() => read(`${JSON.stringify(play)}${' '.repeat(2048)}`)).toThrow()
    expect(() =>
      read(JSON.stringify({ version: 1, op: 'stop', id: null, path: 'bgm.wav' })),
    ).toThrow()
  })

  test('music, loops=N, batched voices and pause/resume travel; malformed shapes do not', () => {
    expect(read(JSON.stringify({ ...play, music: true, repeat: 3 }))).toEqual({
      ...play,
      music: true,
      repeat: 3,
    })
    for (const repeat of [0, -1, 1.5, 1001, '2'])
      expect(() => read(JSON.stringify({ ...play, repeat }))).toThrow()
    expect(() => read(JSON.stringify({ ...play, loop: true, repeat: 2 }))).toThrow()
    expect(() => read(JSON.stringify({ ...play, music: false }))).toThrow()
    expect(read(JSON.stringify({ version: 1, op: 'stop', ids: [1, 2] }))).toEqual({
      version: 1,
      op: 'stop',
      ids: [1, 2],
    })
    expect(read(JSON.stringify({ version: 1, op: 'volume', ids: [4], volume: 0 }))).toEqual({
      version: 1,
      op: 'volume',
      ids: [4],
      volume: 0,
    })
    for (const ids of [[], [0], Array.from({ length: 65 }, (_, i) => i + 1), 'x'])
      expect(() => read(JSON.stringify({ version: 1, op: 'stop', ids }))).toThrow()
    for (const op of ['pause', 'resume'] as const) {
      expect(read(JSON.stringify({ version: 1, op, id: 2 }))).toEqual({ version: 1, op, id: 2 })
      expect(() => read(JSON.stringify({ version: 1, op, id: null }))).toThrow()
    }
  })
})
