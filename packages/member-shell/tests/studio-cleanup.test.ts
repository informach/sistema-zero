import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'
import {
  CLEANUP_PATH,
  coverKeyFromPublicUrl,
  verifyCleanupSignature,
} from '../src/lib/studio-cleanup'

const SECRET = 'test-gateway-hmac-secret-0001'

/** Assina como o hub: `signHmac(secret, canonical, ts)` com canonical `POST.<path>.<body>`. */
function sign(secret: string, rawBody: string, ts: number): string {
  const canonical = `POST.${CLEANUP_PATH}.${rawBody}`
  const v1 = createHmac('sha256', secret).update(`${ts}.${canonical}`).digest('hex')
  return `t=${ts},v1=${v1}`
}

describe('verifyCleanupSignature', () => {
  const ts = 1_700_000_000
  const body = JSON.stringify({ playId: 'p', coverUrl: null })

  test('assinatura válida → true', () => {
    expect(verifyCleanupSignature(SECRET, body, sign(SECRET, body, ts), ts)).toBe(true)
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

describe('coverKeyFromPublicUrl', () => {
  const base = 'https://cdn.example.com'

  test('capa sob studio/cover/ → key', () => {
    expect(coverKeyFromPublicUrl(base, `${base}/studio/cover/abc/def.webp`)).toBe(
      'studio/cover/abc/def.webp',
    )
    // Tolera barra final na base.
    expect(coverKeyFromPublicUrl(`${base}/`, `${base}/studio/cover/x.webp`)).toBe(
      'studio/cover/x.webp',
    )
  })

  test('fora do prefixo studio/cover/ → null (nunca apaga key arbitrária)', () => {
    expect(coverKeyFromPublicUrl(base, `${base}/studio/play/abc.json`)).toBeNull()
    expect(coverKeyFromPublicUrl(base, `${base}/avatars/x.webp`)).toBeNull()
  })

  test('URL de outra origem → null', () => {
    expect(coverKeyFromPublicUrl(base, 'https://evil.example/studio/cover/x.webp')).toBeNull()
  })

  test('base ausente → null', () => {
    expect(coverKeyFromPublicUrl(undefined, `${base}/studio/cover/x.webp`)).toBeNull()
  })
})
