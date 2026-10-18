import { describe, expect, test } from 'bun:test'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from './read-json-body'

describe('readJsonBodyWithLimit', () => {
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
