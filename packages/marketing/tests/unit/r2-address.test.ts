import { expect, test } from 'bun:test'
import { assetFilename, r2ObjectUrl } from '@sistemazero/marketing-contracts'
import { R2MediaStore } from '../../src/infrastructure/gateways/r2/r2-media-store'

test('R2 SDK signed addresses are accepted by both clients without accepting other domains', async () => {
  const store = new R2MediaStore({
    accountId: 'a'.repeat(32),
    accessKeyId: 'review-access',
    secretAccessKey: 'review-secret-not-a-real-key',
    bucket: 'testes-marketing',
  })
  const signed = await store.presignPut({
    key: 'editorial/review/image.png',
    contentType: 'image/png',
    sizeBytes: 1024,
    expiresInSeconds: 60,
  })
  expect(new URL(signed).hostname).toBe(
    `testes-marketing.${'a'.repeat(32)}.r2.cloudflarestorage.com`,
  )
  expect(r2ObjectUrl(signed)).toBe(signed)
  expect(
    r2ObjectUrl(`https://${'a'.repeat(32)}.r2.cloudflarestorage.com/testes-marketing/image.png`),
  ).toContain('/testes-marketing/')
  for (const value of [
    signed.replace('https:', 'http:'),
    signed.replace('.com/', '.com.evil.test/'),
    signed.replace('.com/', '.com:8443/'),
    signed.replace('https://', 'https://user:pass@'),
    `${signed}#fragment`,
    'https://127.0.0.1/file',
    'https://evil.test/file',
  ])
    expect(() => r2ObjectUrl(value)).toThrow()
})
test('download filenames cannot introduce paths, control characters or reserved Windows device names', () => {
  expect(assetFilename('../../arquivo.png')).toBe('arquivo.png')
  expect(assetFilename('C:\\origem\\peça.png')).toBe('peça.png')
  expect(assetFilename('CON.png')).toBe('arquivo-CON.png')
  expect(assetFilename('arquivo\r\n.js')).toBe('arquivo__.js')
})
