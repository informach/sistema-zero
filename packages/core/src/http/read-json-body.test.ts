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
})
