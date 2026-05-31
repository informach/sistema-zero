import { describe, expect, test } from 'bun:test'
import {
  buildCorsPluginOptions,
  isOriginAllowed,
} from '../../src/infrastructure/config/cors.config'
import {
  sanitizeRequestHeaders,
  sanitizeResponseHeaders,
} from '../../src/infrastructure/proxy/header-rules'

describe('CORS', () => {
  test('isOriginAllowed', () => {
    expect(isOriginAllowed(null, ['https://x.com'])).toBe(true) // não-CORS
    expect(isOriginAllowed('https://x.com', ['https://x.com'])).toBe(true)
    expect(isOriginAllowed('https://y.com', ['https://x.com'])).toBe(false)
    expect(isOriginAllowed('https://y.com', ['*'])).toBe(true)
    expect(isOriginAllowed('https://sub.x.com', ['/.*\\.x\\.com$/'])).toBe(true)
  })

  test('buildCorsPluginOptions com * vira origin:true', () => {
    expect(buildCorsPluginOptions({ origins: ['*'], credentials: true }).origin).toBe(true)
  })
})

describe('header-rules', () => {
  test('remove hop-by-hop, host, content-length e adiciona X-Forwarded-*', () => {
    const incoming = new Headers({
      connection: 'keep-alive',
      host: 'gw.local',
      'content-length': '10',
      'x-keep': '1',
      'x-forwarded-for': '1.1.1.1',
    })
    const out = sanitizeRequestHeaders(incoming, {
      clientIp: '2.2.2.2',
      proto: 'http',
      host: 'upstream',
      requestId: 'rid-1',
      via: '1.1 gw',
      traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    })
    expect(out.get('connection')).toBeNull()
    expect(out.get('host')).toBeNull()
    expect(out.get('content-length')).toBeNull()
    expect(out.get('x-keep')).toBe('1')
    expect(out.get('x-forwarded-for')).toBe('1.1.1.1, 2.2.2.2')
    expect(out.get('x-forwarded-proto')).toBe('http')
    expect(out.get('x-request-id')).toBe('rid-1')
    expect(out.get('traceparent')).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01')
  })

  test('sanitizeResponseHeaders remove hop-by-hop', () => {
    const out = sanitizeResponseHeaders(
      new Headers({ 'transfer-encoding': 'chunked', 'content-type': 'application/json' }),
    )
    expect(out.get('transfer-encoding')).toBeNull()
    expect(out.get('content-type')).toBe('application/json')
  })
})
