import { describe, expect, test } from 'bun:test'
import { idleTimeoutSecondsFor } from '../../src/interfaces/http/gateway-plugin'

/**
 * O default do Bun.serve (10s) fecha a conexão do CLIENTE enquanto o gateway
 * ainda espera o upstream (TTFB) — anularia o timeoutMs de 35s da rota
 * payments-create (Efí fria ~15-16s). O idleTimeout DEVE cobrir o upstream
 * mais lento com folga, sem nunca ser 0 (colheita de keep-alive ocioso).
 */
describe('idleTimeoutSecondsFor', () => {
  test('cobre o maior timeout de upstream com folga de 10s', () => {
    expect(idleTimeoutSecondsFor(35_000)).toBe(45) // payments-create hoje
    expect(idleTimeoutSecondsFor(15_000)).toBe(25)
    expect(idleTimeoutSecondsFor(15_500)).toBe(26) // arredonda p/ cima
  })

  test('cap no máximo do Bun (255s)', () => {
    expect(idleTimeoutSecondsFor(600_000)).toBe(255)
  })

  test('config sem timeouts (0/inválido) → piso seguro, nunca 0', () => {
    expect(idleTimeoutSecondsFor(0)).toBe(25)
    expect(idleTimeoutSecondsFor(Number.NEGATIVE_INFINITY)).toBe(25)
  })
})
