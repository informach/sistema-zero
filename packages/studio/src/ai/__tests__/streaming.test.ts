import { describe, expect, it } from 'bun:test'
import { consumeSSEStream, parseSSEChunk } from '../streaming'

describe('parseSSEChunk', () => {
  it('parseia eventos delta com content', () => {
    const chunk =
      'data: {"choices":[{"delta":{"content":"Olá"}}]}\n\ndata: {"choices":[{"delta":{"content":" mundo"}}]}\n\n'
    const result = parseSSEChunk(chunk)
    expect(result.events).toHaveLength(2)
    expect(result.events[0]?.content).toBe('Olá')
    expect(result.events[1]?.content).toBe(' mundo')
    expect(result.done).toBe(false)
  })

  it('detecta [DONE] como término', () => {
    const result = parseSSEChunk('data: [DONE]\n\n')
    expect(result.done).toBe(true)
  })

  it('preserva linha incompleta como remainder', () => {
    const r1 = parseSSEChunk('data: {"choices":[{"delta":{"con')
    expect(r1.events).toHaveLength(0)
    expect(r1.remainder).toContain('data:')
    const r2 = parseSSEChunk('tent":"oi"}}]}\n\n', r1.remainder)
    expect(r2.events).toHaveLength(1)
    expect(r2.events[0]?.content).toBe('oi')
  })

  it('ignora linhas sem prefixo data:', () => {
    const chunk = ': comentário SSE\ndata: {"choices":[{"delta":{"content":"a"}}]}\n\n'
    const result = parseSSEChunk(chunk)
    expect(result.events).toHaveLength(1)
  })
})

describe('consumeSSEStream', () => {
  function mockStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    })
  }

  it('concatena os tokens em ordem e invoca onToken para cada delta', async () => {
    const stream = mockStream([
      'data: {"choices":[{"delta":{"content":"Olá"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":", "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"mundo"}}]}\n\n',
      'data: [DONE]\n\n',
    ])
    const tokens: string[] = []
    const full = await consumeSSEStream(stream, (t) => tokens.push(t))
    expect(tokens).toEqual(['Olá', ', ', 'mundo'])
    expect(full).toBe('Olá, mundo')
  })

  // Stream que nunca emite nem fecha — simula servidor "pendurado".
  function hangingStream(): { stream: ReadableStream<Uint8Array>; canceled: () => boolean } {
    let wasCanceled = false
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        wasCanceled = true
      },
    })
    return { stream, canceled: () => wasCanceled }
  }

  it('rejeita com AbortError quando o signal dispara e cancela o reader', async () => {
    const { stream, canceled } = hangingStream()
    const controller = new AbortController()
    const promise = consumeSSEStream(stream, undefined, { signal: controller.signal })
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(canceled()).toBe(true)
  })

  it('rejeita por timeout de ociosidade e cancela o reader', async () => {
    const { stream, canceled } = hangingStream()
    await expect(consumeSSEStream(stream, undefined, { idleTimeoutMs: 20 })).rejects.toThrow(
      /ocioso/,
    )
    expect(canceled()).toBe(true)
  })

  it('rejeita imediatamente se o signal já estiver abortado', async () => {
    const { stream } = hangingStream()
    const controller = new AbortController()
    controller.abort()
    await expect(
      consumeSSEStream(stream, undefined, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
