import { describe, expect, test } from 'bun:test'
import { createParentGateTokenCodec } from '@/server/parent-gate-token'

describe('parent-gate token', () => {
  test('um token emitido em uma instância é aceito por outra com o mesmo segredo', () => {
    const firstInstance = createParentGateTokenCodec('a'.repeat(32))
    const secondInstance = createParentGateTokenCodec('a'.repeat(32))
    const token = firstInstance.issue('account-1')

    expect(secondInstance.verify(token, 'account-1')).toBe(true)
  })

  test('não aceita outro segredo nem outra conta', () => {
    const issuer = createParentGateTokenCodec('a'.repeat(32))
    const token = issuer.issue('account-1')

    expect(createParentGateTokenCodec('b'.repeat(32)).verify(token, 'account-1')).toBe(false)
    expect(issuer.verify(token, 'account-2')).toBe(false)
  })

  test('rejeita no servidor um token copiado depois da janela parental', () => {
    let now = Date.UTC(2026, 7, 16, 12, 0, 0)
    const codec = createParentGateTokenCodec('a'.repeat(32), { now: () => now })
    const token = codec.issue('account-1')

    expect(codec.verify(token, 'account-1')).toBe(true)

    now += 15 * 60_000
    expect(codec.verify(token, 'account-1')).toBe(false)
  })

  test('rejeita payload temporal adulterado, mesmo quando a conta continua igual', () => {
    const codec = createParentGateTokenCodec('a'.repeat(32), {
      now: () => Date.UTC(2026, 7, 16, 12, 0, 0),
    })
    const token = codec.issue('account-1')
    const parts = token.split('.')
    const payload = parts[1]
    if (!payload) throw new Error('token de teste sem payload')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      accountId: string
      expiresAt: number
    }
    decoded.expiresAt += 60_000
    parts[1] = Buffer.from(JSON.stringify(decoded)).toString('base64url')

    expect(codec.verify(parts.join('.'), 'account-1')).toBe(false)
  })

  test('rejeita token assinado emitido além da tolerância de relógio', () => {
    const base = Date.UTC(2026, 7, 16, 12, 0, 0)
    const issuer = createParentGateTokenCodec('a'.repeat(32), { now: () => base + 6_000 })
    const verifier = createParentGateTokenCodec('a'.repeat(32), { now: () => base })

    expect(verifier.verify(issuer.issue('account-1'), 'account-1')).toBe(false)
  })

  test('rejeita token assinado cuja duração excede o TTL aceito pela réplica', () => {
    const now = Date.UTC(2026, 7, 16, 12, 0, 0)
    const issuer = createParentGateTokenCodec('a'.repeat(32), {
      now: () => now,
      ttlMs: 16 * 60_000,
    })
    const verifier = createParentGateTokenCodec('a'.repeat(32), { now: () => now })

    expect(verifier.verify(issuer.issue('account-1'), 'account-1')).toBe(false)
  })

  test.each([
    '',
    'v1',
    'v1.payload',
    'v2.payload.signature',
    'v1.payload.assinatura-nao-hexadecimal',
    `v1.payload.${'a'.repeat(64)}.extra`,
  ])('rejeita formato malformado sem lançar: %s', (token) => {
    const codec = createParentGateTokenCodec('a'.repeat(32))

    expect(codec.verify(token, 'account-1')).toBe(false)
  })
})
