import { describe, expect, test } from 'bun:test'
import {
  TURTLE_GRAPHICS_LIMITS as limits,
  readTurtleGraphicsRequest as read,
} from './graphicsProtocol'
import { readTurtleImage } from './images'

const request = (operations: unknown[], query: unknown = null) =>
  JSON.stringify({ version: 1, operations, query })

describe('untrusted Turtle graphics boundary', () => {
  test('versioned limits bound UTF-8 bytes, viewport and waits independently', () => {
    expect(() => read(request([{ op: 'size', width: 1920, height: 1080 }]))).not.toThrow()
    for (const size of [
      [1921, 1080],
      [1920, 1081],
    ])
      expect(() => read(request([{ op: 'size', width: size[0], height: size[1] }]))).toThrow()
    for (const timeoutMs of [null, 0, 2_147_483_647])
      expect(read(request([], { type: 'wait', timeoutMs })).query).toEqual({
        type: 'wait',
        timeoutMs,
      })
    for (const timeoutMs of [-1, 0.5, 2_147_483_648, '0'])
      expect(() => read(request([], { type: 'wait', timeoutMs }))).toThrow()
    const raw = JSON.stringify({
      version: 1,
      operations: [],
      query: null,
      ignored: '🐢'.repeat(300_000),
    })
    expect(raw.length).toBeLessThan(limits.requestChars)
    expect(() => read(raw)).toThrow()
  })
  test('copies known fields and preserves scene order without forwarding options', () => {
    const raw = request(
      [
        { op: 'create', id: 1, kind: 'line', onclick: 'script' },
        {
          op: 'patch',
          id: 1,
          points: [
            [0, 0],
            [10, -20],
          ],
          fill: '#123456',
          width: 3,
          innerHTML: '<script>',
        },
        { op: 'raise', id: 1 },
      ],
      { type: 'present', code: 'script' },
    )
    expect(read(raw)).toEqual({
      version: 1,
      operations: [
        { op: 'create', id: 1, kind: 'line' },
        {
          op: 'patch',
          id: 1,
          points: [
            [0, 0],
            [10, -20],
          ],
          fill: '#123456',
          width: 3,
        },
        { op: 'raise', id: 1 },
      ],
      query: { type: 'present' },
    })
  })
  test('rejects commands, coordinates, colors, dimensions and text outside bounds', () => {
    for (const operation of [
      { op: 'eval', source: 'alert(1)' },
      { op: 'create', id: -1, kind: 'line' },
      { op: 'patch', id: 1, points: [[1, null]] },
      { op: 'patch', id: 1, fill: 'url(https://other.test)' },
      { op: 'patch', id: 1, width: -1 },
      { op: 'size', width: 100_000, height: 100_000 },
      { op: 'title', text: 'x'.repeat(513) },
      { op: 'bind', id: 1, event: 'message', button: 1, enabled: true },
    ])
      expect(() => read(request([operation]))).toThrow()
    expect(() => read(' '.repeat(2_000_001))).toThrow()
    expect(() => read(request(Array.from({ length: 4097 }, () => ({ op: 'focus' }))))).toThrow()
    expect(() =>
      read(
        request([{ op: 'patch', id: 1, points: Array.from({ length: 100_001 }, () => [1, 2]) }]),
      ),
    ).toThrow()
  })
  test('validates image headers before decoding and freezes GIF at the first frame', () => {
    const gif = new Uint8Array(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'),
    )
    const single = readTurtleImage(gif)
    expect([single.type, single.width, single.height]).toEqual(['image/gif', 1, 1])
    const animation = new Uint8Array([...gif.slice(0, -1), ...gif.slice(27)])
    expect([...readTurtleImage(animation).bytes]).toEqual([...single.bytes])
    const bomb = gif.slice()
    bomb[6] = bomb[7] = bomb[8] = bomb[9] = 255
    expect(() => readTurtleImage(bomb)).toThrow()
    expect(() => readTurtleImage(gif.slice(0, -3))).toThrow()
    expect(() => readTurtleImage(new Uint8Array(16 * 1024 * 1024 + 1))).toThrow()
    const descriptorBomb = gif.slice()
    const descriptor = descriptorBomb.indexOf(0x2c)
    descriptorBomb[descriptor + 5] = 255
    expect(() => readTurtleImage(descriptorBomb)).toThrow()
  })
})
