import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { r2PresignPutUgc } = await import('../src/server/r2')

describe('R2 UGC — assinatura de PUT', () => {
  test('assina o tipo e o tamanho exatos exigidos do navegador', async () => {
    const url = await r2PresignPutUgc({
      key: 'creations/perfil/pinta/desenho/1.json.gz',
      contentType: 'application/gzip',
      contentLength: 1234,
      expiresInSeconds: 600,
    })

    const signedHeaders = new URL(url).searchParams.get('X-Amz-SignedHeaders')?.split(';')
    expect(signedHeaders).toContain('content-type')
    expect(signedHeaders).toContain('content-length')
  })
})

test('o ticket causal assina If-None-Match e ancora o prazo na hora da reserva', async () => {
  const url = await r2PresignPutUgc({
    key: 'creations/perfil/pinta/desenho/units/nonce/1.upload.gz',
    contentType: 'application/gzip',
    contentLength: 1234,
    expiresInSeconds: 60,
    signingDate: new Date('2026-11-22T12:00:00Z'),
    criarUmaVez: true,
  })

  const signed = new URL(url).searchParams
  expect(signed.get('X-Amz-SignedHeaders')?.split(';')).toContain('if-none-match')
  expect(signed.get('X-Amz-Date')).toBe('20261122T120000Z')
  expect(signed.get('X-Amz-Expires')).toBe('60')
})
