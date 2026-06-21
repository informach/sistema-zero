import { describe, expect, test } from 'bun:test'
import { type AuthContext, resolveClientIp } from '../../src/interfaces/http/auth'

describe('resolveClientIp', () => {
  test('trustProxy=false sempre retorna requestIP', () => {
    const req = new Request('http://localhost/auth')
    const ctx: AuthContext = {
      request: req,
      server: { requestIP: () => ({ address: '198.51.100.99' }) },
      headers: {
        'x-forwarded-for': '2001:db8::1, 203.0.113.5, 198.51.100.7',
      },
    }

    expect(resolveClientIp(ctx, false, 1)).toBe('198.51.100.99')
  })

  test('trustProxy=true com 1 hop retorna o IP anterior ao proxy confiável', () => {
    const req = new Request('http://localhost/auth')
    const ctx: AuthContext = {
      request: req,
      server: { requestIP: () => ({ address: '198.51.100.99' }) },
      headers: {
        'x-forwarded-for': '203.0.113.10, 203.0.113.11, 203.0.113.12',
      },
    }

    expect(resolveClientIp(ctx, true, 1)).toBe('203.0.113.11')
  })

  test('trustProxy=true com cadeia curta demais usa fallback do socket', () => {
    const req = new Request('http://localhost/auth')
    const ctx: AuthContext = {
      request: req,
      server: { requestIP: () => ({ address: '198.51.100.99' }) },
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    }

    expect(resolveClientIp(ctx, true, 1)).toBe('198.51.100.99')
  })
})
