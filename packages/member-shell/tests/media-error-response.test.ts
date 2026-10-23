import { describe, expect, mock, spyOn, test } from 'bun:test'
import { StudioReservationRetirementSchema } from '@sistemazero/core/studio/publication-reservation'
import { WatermarkUnavailableError } from '../src/server/watermark-error'
import { reservationFixture } from './fixtures/studio-reservation'

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
  for (const environment of ['production', 'development']) {
    test(`reservation protocol diagnostics are ${environment === 'production' ? 'redacted' : 'available'} in ${environment}`, async () => {
      const previous = process.env.NODE_ENV
      const log = spyOn(console, 'error').mockImplementation(() => {})
      try {
        Object.assign(process.env, { NODE_ENV: environment })
        const invalid = StudioReservationRetirementSchema.safeParse({
          ...reservationFixture(),
          deliveryId: 'not-the-reservation-delivery',
        })
        expect(invalid.success).toBe(false)
        if (invalid.success) throw new Error('Expected a real protocol validation failure')
        expect(invalid.error.message).toContain('Entrega divergente da reserva.')
        const response = mediaErrorResponse(invalid.error)
        expect(response.status).toBe(500)
        const body = (await response.json()) as { error: { code: string; message: string } }
        expect(body.error.code).toBe('MEDIA_ERROR')
        if (environment === 'production') {
          expect(body.error.message).toBe('Falha na operação de mídia.')
          expect(JSON.stringify(body)).not.toContain('Entrega divergente')
          expect(JSON.stringify(body)).not.toContain('deliveryId')
        } else {
          expect(body.error.message).toContain('Entrega divergente da reserva.')
          expect(body.error.message).toContain('deliveryId')
        }
      } finally {
        if (previous === undefined) delete process.env.NODE_ENV
        else Object.assign(process.env, { NODE_ENV: previous })
        log.mockRestore()
      }
    })
  }
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
