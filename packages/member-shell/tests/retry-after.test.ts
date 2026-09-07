import { describe, expect, test } from 'bun:test'
import { RETRY_AFTER_CAP_MS, RETRY_AFTER_DEFAULT_MS, retryAfterMs } from '../src/lib/retry-after'

describe('retryAfterMs', () => {
  test('segundos inteiros viram ms', () => {
    expect(retryAfterMs('10')).toBe(10_000)
    expect(retryAfterMs(' 3 ')).toBe(3_000)
    expect(retryAfterMs('0')).toBe(0)
  })

  test('ausente, vazio, data HTTP ou lixo → default', () => {
    expect(retryAfterMs(null)).toBe(RETRY_AFTER_DEFAULT_MS)
    expect(retryAfterMs(undefined)).toBe(RETRY_AFTER_DEFAULT_MS)
    expect(retryAfterMs('')).toBe(RETRY_AFTER_DEFAULT_MS)
    expect(retryAfterMs('Wed, 21 Oct 2026 07:28:00 GMT')).toBe(RETRY_AFTER_DEFAULT_MS)
    expect(retryAfterMs('-5')).toBe(RETRY_AFTER_DEFAULT_MS)
    expect(retryAfterMs('1.5')).toBe(RETRY_AFTER_DEFAULT_MS)
  })

  test('teto: um valor exagerado não prende o livro em "preparando"', () => {
    expect(retryAfterMs('3600')).toBe(RETRY_AFTER_CAP_MS)
    expect(retryAfterMs('999999999999999999999')).toBe(RETRY_AFTER_CAP_MS)
    expect(retryAfterMs('5', { capMs: 2_000 })).toBe(2_000)
    expect(retryAfterMs(null, { defaultMs: 1_000 })).toBe(1_000)
  })
})
