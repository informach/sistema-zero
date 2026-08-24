import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_PLATFORM,
  PLATFORM_COOKIE,
  PLATFORM_LABELS,
  PLATFORMS,
  parsePlatform,
  platformCookieString,
} from '../src/lib/platform'

describe('platform — seletor global Kids × Adultos (puro)', () => {
  test('kids é o padrão e vem primeiro no alternador', () => {
    expect(DEFAULT_PLATFORM).toBe('kids')
    expect(PLATFORMS[0]).toBe('kids')
  })

  test('parsePlatform: valores válidos passam, lixo/ausente cai no default kids', () => {
    expect(parsePlatform('kids')).toBe('kids')
    expect(parsePlatform('adult')).toBe('adult')
    expect(parsePlatform('both')).toBe('kids')
    expect(parsePlatform('')).toBe('kids')
    expect(parsePlatform(undefined)).toBe('kids')
    expect(parsePlatform(null)).toBe('kids')
    expect(parsePlatform(42)).toBe('kids')
  })

  test('toda plataforma tem rótulo', () => {
    for (const platform of PLATFORMS) {
      expect(PLATFORM_LABELS[platform]).toBeTruthy()
    }
    expect(PLATFORM_LABELS.adult).toBe('Adultos')
  })

  test('cookie string: preferência de 1 ano, SameSite=Lax, Secure só em https', () => {
    const insecure = platformCookieString('adult', false)
    expect(insecure).toBe(`${PLATFORM_COOKIE}=adult; Path=/; Max-Age=31536000; SameSite=Lax`)
    expect(insecure).not.toContain('HttpOnly')
    const secure = platformCookieString('kids', true)
    expect(secure).toBe(`${PLATFORM_COOKIE}=kids; Path=/; Max-Age=31536000; SameSite=Lax; Secure`)
  })
})
