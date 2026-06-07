import { describe, expect, test } from 'bun:test'
import { expireCookieOptions, prefixedCookieName } from '../src/lib/cookies'

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

describe('expireCookieOptions', () => {
  test('prod: expira com Secure + Path=/ (sem isso o browser REJEITA remover __Host-*)', () => {
    expect(expireCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 0,
    })
  })

  test('dev: mesmos atributos da escrita, sem Secure (http)', () => {
    expect(expireCookieOptions(false)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 0,
    })
  })
})
