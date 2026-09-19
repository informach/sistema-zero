import { describe, expect, mock, test } from 'bun:test'
import { WatermarkUnavailableError } from '../src/server/watermark-error'

mock.module('server-only', () => ({}))
const { mediaErrorResponse, WATERMARK_RETRY_AFTER_SECONDS } = await import('../src/server/media')
const { WatermarkQueueAbortedError, WatermarkQueueBusyError } = await import(
  '../src/server/watermark-queue'
)

/**
 * Os erros da fila da marca d'água (incidente 07/09) têm resposta PRÓPRIA:
 * 503 retentável com `Retry-After` — nunca o 500 genérico `MEDIA_ERROR` (que
 * o cliente lê como defeito e ainda dispara Sentry por carga normal).
 */
describe("mediaErrorResponse × fila da marca d'água", () => {
  test('fila cheia → 503 + Retry-After + código WATERMARK_BUSY', async () => {
    const res = mediaErrorResponse(new WatermarkQueueBusyError())
    expect(res.status).toBe(503)
    expect(res.headers.get('retry-after')).toBe(String(WATERMARK_RETRY_AFTER_SECONDS))
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('WATERMARK_BUSY')
    expect(body.error.message).toContain('Tente de novo')
  })

  test('cliente foi embora → 503 sem Retry-After, código WATERMARK_ABORTED', async () => {
    const res = mediaErrorResponse(new WatermarkQueueAbortedError())
    expect(res.status).toBe(503)
    expect(res.headers.get('retry-after')).toBeNull()
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('WATERMARK_ABORTED')
  })

  test('falha de marcação → 503, nunca um PDF original como resposta', async () => {
    const res = mediaErrorResponse(new WatermarkUnavailableError())
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('WATERMARK_UNAVAILABLE')
    expect(body.error.message).toContain('proteger')
  })

  test('erro qualquer segue no 500 MEDIA_ERROR (contrato antigo intacto)', async () => {
    const res = mediaErrorResponse(new Error('boom'))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('MEDIA_ERROR')
  })
})
