import { describe, expect, test } from 'bun:test'
import { clientIp } from '../../src/lib/client-ip'

function reqWith(xff?: string): Request {
  const headers: Record<string, string> = {}
  if (xff) headers['x-forwarded-for'] = xff
  return new Request('http://localhost/api/leads', { method: 'POST', headers })
}

describe('clientIp (IP real p/ o rate limit)', () => {
  test('sem trustProxy → usa o clientAddress do socket (dev/local)', () => {
    expect(clientIp(reqWith('1.2.3.4'), '127.0.0.1', false)).toBe('127.0.0.1')
  })

  test('com trustProxy → ÚLTIMO hop do x-forwarded-for (anexado pela borda confiável)', () => {
    // O cliente pode enviar o próprio XFF ("9.9.9.9"); o proxy anexa o IP real
    // ao FINAL — o último valor é o único fora do controle do cliente.
    expect(clientIp(reqWith('9.9.9.9, 203.0.113.7'), '10.0.0.1', true)).toBe('203.0.113.7')
    expect(clientIp(reqWith('203.0.113.7'), '10.0.0.1', true)).toBe('203.0.113.7')
  })

  test('com trustProxy mas sem XFF → fallback no clientAddress', () => {
    expect(clientIp(reqWith(), '198.51.100.2', true)).toBe('198.51.100.2')
  })

  test('clientAddress vazio → "unknown" (nunca chave vazia)', () => {
    expect(clientIp(reqWith(), '', false)).toBe('unknown')
  })
})
