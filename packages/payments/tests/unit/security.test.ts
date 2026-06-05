import { describe, expect, test } from 'bun:test'
import { canonicalHmacMessage } from '@sistemazero/core/security'
import { signHmac, verifyHmacSignature } from '../../src/infrastructure/security/hmac'
import { ipMatchesAny } from '../../src/infrastructure/security/ip'

describe('HMAC', () => {
  const secret = 'super-secret'
  const body = '{"amountInCents":1000}'
  const now = 1_700_000_000

  test('valida assinatura correta', () => {
    const header = `t=${now},v1=${signHmac(secret, body, now)}`
    const result = verifyHmacSignature({
      secret,
      body,
      signatureHeader: header,
      nowSeconds: now,
      toleranceSeconds: 300,
    })
    expect(result.valid).toBe(true)
  })

  test('rejeita timestamp fora da tolerância (anti-replay)', () => {
    const header = `t=${now},v1=${signHmac(secret, body, now)}`
    const result = verifyHmacSignature({
      secret,
      body,
      signatureHeader: header,
      nowSeconds: now + 1000,
      toleranceSeconds: 300,
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('expired')
  })

  test('rejeita assinatura adulterada', () => {
    const header = `t=${now},v1=${signHmac(secret, 'outro-corpo', now)}`
    const result = verifyHmacSignature({
      secret,
      body,
      signatureHeader: header,
      nowSeconds: now,
      toleranceSeconds: 300,
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('mismatch')
  })

  test('rejeita header ausente ou malformado', () => {
    expect(
      verifyHmacSignature({
        secret,
        body,
        signatureHeader: undefined,
        nowSeconds: now,
        toleranceSeconds: 300,
      }).valid,
    ).toBe(false)
    expect(
      verifyHmacSignature({
        secret,
        body,
        signatureHeader: 'lixo',
        nowSeconds: now,
        toleranceSeconds: 300,
      }).valid,
    ).toBe(false)
  })

  test('rejeita v1 com hex inválido como malformado', () => {
    const r = verifyHmacSignature({
      secret,
      body,
      signatureHeader: `t=${now},v1=zzzz`,
      nowSeconds: now,
      toleranceSeconds: 300,
    })
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('malformed_header')
  })

  test('mensagem canônica amarra método+path (anti replay cross-endpoint)', () => {
    // GET e DELETE do MESMO path com corpo vazio: antes do binding as mensagens
    // eram idênticas (replay de leitura virava cancelamento).
    const get = canonicalHmacMessage({ method: 'get', path: '/subscriptions/abc', body: '' })
    const del = canonicalHmacMessage({ method: 'DELETE', path: '/subscriptions/abc', body: '' })
    expect(get).toBe('GET./subscriptions/abc.') // método normalizado p/ maiúsculas
    expect(get).not.toBe(del)
    // Paths diferentes também divergem; com Idempotency-Key ela entra na mensagem.
    expect(
      canonicalHmacMessage({ method: 'POST', path: '/payments', idempotencyKey: 'k1', body: '{}' }),
    ).toBe('POST./payments.k1.{}')
  })

  test('binding da Idempotency-Key: a chave faz parte da mensagem assinada', () => {
    // O serviço assina "<idempotencyKey>.<body>": trocar a chave invalida a assinatura.
    const idemKey = 'idem-12345678'
    const header = `t=${now},v1=${signHmac(secret, `${idemKey}.${body}`, now)}`
    expect(
      verifyHmacSignature({
        secret,
        body: `${idemKey}.${body}`,
        signatureHeader: header,
        nowSeconds: now,
        toleranceSeconds: 300,
      }).valid,
    ).toBe(true)
    // Mesma assinatura com OUTRA chave → mensagem diferente → inválida (anti-replay com troca de chave).
    expect(
      verifyHmacSignature({
        secret,
        body: `outra-chave.${body}`,
        signatureHeader: header,
        nowSeconds: now,
        toleranceSeconds: 300,
      }).valid,
    ).toBe(false)
  })
})

describe('IP allowlist (CIDR)', () => {
  test('casa IP dentro da faixa CIDR', () => {
    expect(ipMatchesAny('10.0.0.5', ['10.0.0.0/24'])).toBe(true)
    expect(ipMatchesAny('10.0.5.5', ['10.0.0.0/8'])).toBe(true)
  })

  test('recusa IP fora da faixa', () => {
    expect(ipMatchesAny('192.168.1.1', ['10.0.0.0/8'])).toBe(false)
  })

  test('casa IP exato e loopback IPv6', () => {
    expect(ipMatchesAny('127.0.0.1', ['127.0.0.1'])).toBe(true)
    expect(ipMatchesAny('::1', ['::1'])).toBe(true)
  })

  test('normaliza IPv4 mapeado em IPv6', () => {
    expect(ipMatchesAny('::ffff:10.0.0.5', ['10.0.0.0/24'])).toBe(true)
  })

  test('allowlist vazia recusa tudo (fail-closed)', () => {
    expect(ipMatchesAny('10.0.0.5', [])).toBe(false)
  })

  test('regra CIDR inválida não casa (não derruba a verificação)', () => {
    expect(ipMatchesAny('10.0.0.5', ['10.0.0.0/33'])).toBe(false) // bits fora de 0..32
    expect(ipMatchesAny('10.0.0.5', ['nao-é-ip/24'])).toBe(false)
    expect(ipMatchesAny('10.0.0.5', ['10.0.0.0/-1'])).toBe(false)
  })

  test('IPv4 fora do range por 1 bit', () => {
    expect(ipMatchesAny('10.0.1.0', ['10.0.0.0/24'])).toBe(false)
  })

  test('CIDR IPv6 agora casa (antes era deny-all)', () => {
    expect(ipMatchesAny('2001:db8::1', ['2001:db8::/32'])).toBe(true)
    expect(ipMatchesAny('2001:db9::1', ['2001:db8::/32'])).toBe(false)
    expect(ipMatchesAny('fe80::1', ['fe80::/10'])).toBe(true)
  })

  test('famílias diferentes nunca casam', () => {
    expect(ipMatchesAny('10.0.0.5', ['2001:db8::/32'])).toBe(false)
    expect(ipMatchesAny('2001:db8::1', ['10.0.0.0/8'])).toBe(false)
  })

  test('/0 casa qualquer endereço da mesma família', () => {
    expect(ipMatchesAny('203.0.113.7', ['0.0.0.0/0'])).toBe(true)
  })
})
