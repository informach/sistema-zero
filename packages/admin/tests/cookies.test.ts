import { describe, expect, test } from 'bun:test'
import { prefixedCookieName } from '../src/lib/cookies'

describe('prefixedCookieName', () => {
  test('produção usa o prefixo __Host- (Secure + Path=/ + sem Domain)', () => {
    expect(prefixedCookieName('sz_admin_access', true)).toBe('__Host-sz_admin_access')
    expect(prefixedCookieName('sz_admin_refresh', true)).toBe('__Host-sz_admin_refresh')
  })

  test('dev/local omite o prefixo (__Host- exige Secure, rejeitado sob http)', () => {
    expect(prefixedCookieName('sz_admin_access', false)).toBe('sz_admin_access')
    expect(prefixedCookieName('sz_admin_refresh', false)).toBe('sz_admin_refresh')
  })
})
