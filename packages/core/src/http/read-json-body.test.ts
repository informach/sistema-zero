import { describe, expect, test } from 'bun:test'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
  readTextBodyWithLimit,
} from './read-json-body'

describe('readJsonBodyWithLimit', () => {
  test('a leitura para HMAC conserva o texto original e conta UTF-8, sem reserializar', async () => {
    const text = '{ "nome": "ação" }\n'
    const request = () => new Request('https://example.test', { method: 'POST', body: text })
    expect(await readTextBodyWithLimit(request(), new TextEncoder().encode(text).byteLength)).toBe(
      text,
    )
    await expect(readTextBodyWithLimit(request(), text.length)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    )
    expect(await readTextBodyWithLimit(new Request('https://example.test'), 10)).toBe('')
    await expect(
      readJsonBodyWithLimit(new Request('https://example.test'), 10),
    ).rejects.toBeInstanceOf(InvalidJsonBodyError)
  })
  test('conta bytes reais do stream e diferencia JSON inválido', async () => {
    await expect(
      readJsonBodyWithLimit(
        new Request('https://example.test', { method: 'POST', body: JSON.stringify({ ok: true }) }),
        4,
      ),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError)
    await expect(
      readJsonBodyWithLimit(new Request('https://example.test', { method: 'POST', body: '{' }), 10),
    ).rejects.toBeInstanceOf(InvalidJsonBodyError)
  })

  test('cancelamento interrompe leitura pendente sem aguardar confirmação do produtor', async () => {
    const controller = new AbortController()
    let cancelled = 0
    const body = new ReadableStream<Uint8Array>(
      {
        cancel() {
          cancelled++
          return new Promise(() => {})
        },
      },
      { highWaterMark: 0 },
    )
    const result = readJsonBodyWithLimit({ headers: new Headers(), body }, 100, controller.signal)
    controller.abort(new Error('request retired'))
    await expect(result).rejects.toThrow('request retired')
    expect(cancelled).toBe(1)
  })

  test('limite de bytes com signal não fica preso no cancelamento do produtor', async () => {
    let cancelled = 0
    const body = new ReadableStream<Uint8Array>(
      {
        start(controller) {
          controller.enqueue(new Uint8Array(101))
        },
        cancel() {
          cancelled++
          return new Promise(() => {})
        },
      },
      { highWaterMark: 0 },
    )
    await expect(
      readJsonBodyWithLimit({ headers: new Headers(), body }, 100, new AbortController().signal),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError)
    expect(cancelled).toBe(1)
  })
})
