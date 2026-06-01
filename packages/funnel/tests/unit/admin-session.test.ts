import { describe, expect, test } from 'bun:test'
import {
  ADMIN_COOKIE,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  verifyAdminSession,
} from '../../src/lib/admin-session'

const SECRET = 'test_admin_session_secret_0123456789'
const TTL = 60 * 60 * 12

const pair = (setCookie: string) => setCookie.split(';')[0] ?? ''
const reqWith = (cookie: string) => new Request('http://localhost/admin', { headers: { cookie } })

describe('admin-session', () => {
  test('cria e verifica uma sessão válida', () => {
    const sc = createAdminSessionCookie(SECRET, false, 1000)
    expect(sc).toContain(`${ADMIN_COOKIE}=`)
    expect(sc).toContain('HttpOnly')
    expect(sc).toContain('SameSite=Lax')
    expect(verifyAdminSession(reqWith(pair(sc)), SECRET, 1000)).toBe(true)
  })

  test('rejeita sessão expirada', () => {
    const sc = createAdminSessionCookie(SECRET, false, 1000)
    expect(verifyAdminSession(reqWith(pair(sc)), SECRET, 1000 + TTL + 1)).toBe(false)
  })

  test('rejeita assinatura adulterada', () => {
    const cookie = pair(createAdminSessionCookie(SECRET, false, 1000))
    const last = cookie.slice(-1)
    const tampered = cookie.slice(0, -1) + (last === '0' ? '1' : '0')
    expect(verifyAdminSession(reqWith(tampered), SECRET, 1000)).toBe(false)
  })

  test('rejeita segredo errado', () => {
    const sc = createAdminSessionCookie(SECRET, false, 1000)
    expect(verifyAdminSession(reqWith(pair(sc)), 'outro-segredo-aaaaaaaaaaaaaaaa', 1000)).toBe(
      false,
    )
  })

  test('sem cookie → false', () => {
    expect(verifyAdminSession(new Request('http://localhost/admin'), SECRET, 1000)).toBe(false)
  })

  test('Secure quando secure=true; clear zera o Max-Age', () => {
    expect(createAdminSessionCookie(SECRET, true, 1000)).toContain('Secure')
    expect(clearAdminSessionCookie(true)).toContain('Max-Age=0')
  })
})
