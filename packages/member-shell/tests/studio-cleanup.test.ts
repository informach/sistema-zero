import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import {
  CLEANUP_PATH,
  RESERVATION_CLEANUP_PATH,
  verifyCleanupSignature,
  verifyReservationCleanupSignature,
} from '../src/lib/studio-cleanup'

const SECRET = 'test-gateway-hmac-secret-0001'

/** Assina como o hub: `signHmac(secret, canonical, ts)` com canonical `POST.<path>.<body>`. */
function sign(secret: string, rawBody: string, ts: number, path: string = CLEANUP_PATH): string {
  const canonical = `POST.${path}.${rawBody}`
  const v1 = createHmac('sha256', secret).update(`${ts}.${canonical}`).digest('hex')
  return `t=${ts},v1=${v1}`
}

describe('verifyCleanupSignature', () => {
  const ts = 1_700_000_000
  const body = JSON.stringify({ playId: 'p', coverUrl: null })

  test('assinatura válida → true', () => {
    expect(verifyCleanupSignature(SECRET, body, sign(SECRET, body, ts), ts)).toBe(true)
  })

  test('assinaturas não podem ser reaproveitadas entre retirada de reserva e moderação', () => {
    const deliveryId = `studio-reservation-cleanup:${crypto.randomUUID()}`
    const reservationSignature = `t=${ts},v1=${signHmac(SECRET, canonicalHmacMessage({ method: 'POST', path: RESERVATION_CLEANUP_PATH, deliveryId, body }), ts)}`
    expect(
      verifyReservationCleanupSignature(SECRET, body, reservationSignature, deliveryId, ts),
    ).toBe(true)
    expect(verifyCleanupSignature(SECRET, body, reservationSignature, ts)).toBe(false)
    expect(
      verifyReservationCleanupSignature(SECRET, body, sign(SECRET, body, ts), deliveryId, ts),
    ).toBe(false)
    expect(
      verifyReservationCleanupSignature(SECRET, `${body} `, reservationSignature, deliveryId, ts),
    ).toBe(false)
    expect(
      verifyReservationCleanupSignature(SECRET, body, reservationSignature, deliveryId, ts + 3600),
    ).toBe(false)
  })

  test('corpo adulterado → false', () => {
    const header = sign(SECRET, body, ts)
    expect(verifyCleanupSignature(SECRET, `${body} `, header, ts)).toBe(false)
  })

  test('segredo errado → false', () => {
    expect(
      verifyCleanupSignature('outro-segredo-diferente', body, sign(SECRET, body, ts), ts),
    ).toBe(false)
  })

  test('timestamp fora da tolerância → false (anti-replay)', () => {
    const header = sign(SECRET, body, ts)
    expect(verifyCleanupSignature(SECRET, body, header, ts + 3_600)).toBe(false)
  })

  test('header ausente/malformado → false', () => {
    expect(verifyCleanupSignature(SECRET, body, null, ts)).toBe(false)
    expect(verifyCleanupSignature(SECRET, body, 'lixo', ts)).toBe(false)
    expect(verifyCleanupSignature(SECRET, body, `t=${ts},v1=zzz`, ts)).toBe(false)
  })
})
