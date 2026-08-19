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
