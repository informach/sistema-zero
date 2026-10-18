import { describe, expect, test } from 'bun:test'
import { createPythonConsoleBuffer } from './consoleBuffer'
import { PYTHON_CONSOLE_LIMITS as LIMITS } from './protocol'

const batch = (stream: 'stdout' | 'stderr', text: string) => ({
  stream,
  text,
  omittedLines: 0,
  omittedChars: 0,
})
describe('bounded Python console', () => {
  test('snapshots do not consume or expose retained chunks and preserve upstream omissions', () => {
    const buffer = createPythonConsoleBuffer()
    buffer.appendBatch({ ...batch('stdout', 'Primeira\n'), omittedChars: 100, omittedLines: 3 })
    const first = buffer.snapshot()
    first[0]!.text = 'mutated'
    buffer.appendBatch(batch('stderr', 'Aviso\n'))
    const expected = [
      { ...batch('stdout', 'Primeira\n'), omittedChars: 100, omittedLines: 3 },
      batch('stderr', 'Aviso\n'),
    ]
    expect(buffer.snapshot()).toEqual(expected)
    expect(buffer.snapshot()).toEqual(expected)
    expect(buffer.drain()).toEqual(expected)
    expect(buffer.snapshot()).toEqual([])
  })
  test('keeps exact writes and stream order, without adding newlines on flush', () => {
    const buffer = createPythonConsoleBuffer()
    buffer.append('stdout', 'Oi')
    expect(buffer.drain()).toEqual([batch('stdout', 'Oi')])
    buffer.append('stdout', '\n\n')
    buffer.append('stderr', 'erro\n')
    buffer.append('stdout', 'fim')
    expect(buffer.drain()).toEqual([
      batch('stdout', '\n\n'),
      batch('stderr', 'erro\n'),
      batch('stdout', 'fim'),
    ])
    expect(buffer.drain()).toEqual([])
    expect(buffer.pendingChars).toBe(0)
  })

  test('bounds a synchronous print flood without timers and counts discarded lines/characters', () => {
    const buffer = createPythonConsoleBuffer()
    let total = 0
    for (let i = 0; i < 100_000; i++) {
      const line = `${i}\n`
      total += line.length
      buffer.append(i % 2 ? 'stderr' : 'stdout', line)
    }
    expect(buffer.pendingChunks).toBe(LIMITS.retainedChunks)
    expect(buffer.pendingChars).toBeLessThanOrEqual(LIMITS.retainedChars)
    const batches = buffer.drain()
    expect(batches.reduce((sum, item) => sum + item.omittedLines, 0)).toBe(
      100_000 - LIMITS.retainedChunks,
    )
    const kept = batches.map((item) => item.text).join('')
    expect(kept).toBe(Array.from({ length: 128 }, (_, i) => `${100_000 - 128 + i}\n`).join(''))
    expect(batches.reduce((sum, item) => sum + item.omittedChars, 0) + kept.length).toBe(total)
    expect(batches.every((item) => item.text.length <= LIMITS.batchChars)).toBe(true)
  })

  test('bounds output without any newline before decoding or retaining a full line', () => {
    const buffer = createPythonConsoleBuffer()
    const bytes = new Uint8Array(2_000_000).fill(120)
    expect(buffer.write('stdout', bytes)).toBe(bytes.length)
    expect(buffer.pendingChars).toBeLessThanOrEqual(LIMITS.retainedChars)
    const batches = buffer.drain()
    const kept = batches.map((item) => item.text).join('')
    expect(kept).toMatch(/^x+$/)
    expect(batches.reduce((sum, item) => sum + item.omittedChars, 0) + kept.length).toBe(
      bytes.length,
    )
    expect(batches.reduce((sum, item) => sum + item.omittedLines, 0)).toBe(0)
    expect(batches.every((item) => item.text.length <= LIMITS.batchChars)).toBe(true)
  })

  test('decodes UTF-8 split across writes and drains without retaining input memory', () => {
    const buffer = createPythonConsoleBuffer()
    const bytes = new TextEncoder().encode('ação 🐢\n')
    let output = ''
    for (const value of bytes) {
      const input = new Uint8Array([value])
      buffer.write('stdout', input)
      input.fill(0)
      output += buffer
        .drain()
        .map((item) => item.text)
        .join('')
    }
    expect(output).toBe('ação 🐢\n')
  })

  test('clearing a stopped generation releases text, decoder state and omission counters', () => {
    const buffer = createPythonConsoleBuffer()
    buffer.write('stderr', new Uint8Array(100_000).fill(120))
    buffer.write('stdout', new Uint8Array([0xf0, 0x9f]))
    buffer.clear()
    expect(buffer.pendingChunks).toBe(0)
    expect(buffer.pendingChars).toBe(0)
    buffer.write('stdout', new TextEncoder().encode('new'))
    expect(buffer.drain()).toEqual([batch('stdout', 'new')])
  })
})
