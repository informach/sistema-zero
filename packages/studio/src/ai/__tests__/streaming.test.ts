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

  // Stream que entrega [DONE] mas NÃO fecha o body (como a OpenRouter faz) —
  // expomos se o reader foi cancelado p/ liberar a conexão.
  function doneButOpenStream(chunks: string[]): {
    stream: ReadableStream<Uint8Array>
    canceled: () => boolean
  } {
    let wasCanceled = false
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        // Sem controller.close() — o body fica aberto após o [DONE].
      },
      cancel() {
        wasCanceled = true
      },
    })
    return { stream, canceled: () => wasCanceled }
  }

  it('cancela o reader ao quebrar por [DONE] mesmo com o body aberto', async () => {
    const { stream, canceled } = doneButOpenStream([
      'data: {"choices":[{"delta":{"content":"oi"}}]}\n\n',
      'data: [DONE]\n\n',
    ])
    const full = await consumeSSEStream(stream)
    expect(full).toBe('oi')
    expect(canceled()).toBe(true)
  })

  it('NÃO cancela o reader quando o stream fecha sozinho (EOF natural)', async () => {
    let wasCanceled = false
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"x"}}]}\n\n'))
        controller.close()
      },
      cancel() {
        wasCanceled = true
      },
    })
    const full = await consumeSSEStream(stream)
    expect(full).toBe('x')
    expect(wasCanceled).toBe(false)
  })

  it('remonta caractere multi-byte partido na fronteira de chunks', async () => {
    // "é" em UTF-8 = 0xC3 0xA9 (2 bytes). Cortamos EXATAMENTE entre os 2 bytes:
    // o 1º byte chega num chunk e o 2º no chunk seguinte. O decode incremental
    // ({ stream: true }) tem que segurar o byte parcial e remontar o caractere
    // sem corromper — guarda de não-regressão do caminho de decode.
    const encoder = new TextEncoder()
    const event = encoder.encode('data: {"choices":[{"delta":{"content":"café"}}]}\n\n')
    const idx = event.indexOf(0xc3) // 1º byte de "é"
    expect(idx).toBeGreaterThan(0)
    const head = event.slice(0, idx + 1)
    const tail = event.slice(idx + 1)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(head)
        controller.enqueue(tail)
        controller.close()
      },
    })
    const result = await consumeSSEStream(stream)
    expect(result).toBe('café')
  })

  it('faz flush terminal do decoder ao fim do stream (não deixa bytes presos)', async () => {
    // Caso do flush terminal: a ÚLTIMA leitura do stream entrega um caractere
    // multi-byte COMPLETO mas via { stream: true } o TextDecoder pode segurar
    // estado interno; o decode() final (sem args) garante que nada fica preso.
    // Verificamos que o conteúdo acentuado emitido no derradeiro chunk (que
    // fecha o bloco e o stream juntos) chega íntegro à saída.
    const stream = mockStream([
      'data: {"choices":[{"delta":{"content":"ç"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"ãé"}}]}\n\n',
    ])
    const result = await consumeSSEStream(stream)
    expect(result).toBe('çãé')
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
