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
})
