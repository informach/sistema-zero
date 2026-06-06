import { describe, expect, test } from 'bun:test'
import { prefixedCookieName } from '../src/lib/cookies'

describe('prefixedCookieName', () => {
  test('produção usa o prefixo __Host- (Secure + Path=/ + sem Domain)', () => {
    expect(prefixedCookieName('sz_member_access', true)).toBe('__Host-sz_member_access')
    expect(prefixedCookieName('sz_member_refresh', true)).toBe('__Host-sz_member_refresh')
  })

  test('dev/local omite o prefixo (__Host- exige Secure, rejeitado sob http)', () => {
    expect(prefixedCookieName('sz_member_access', false)).toBe('sz_member_access')
    expect(prefixedCookieName('sz_member_refresh', false)).toBe('sz_member_refresh')
  })
})
