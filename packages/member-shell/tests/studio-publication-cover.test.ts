import { afterEach, expect, mock, spyOn, test } from 'bun:test'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'publication-cover-test-secret-32-characters'
const storage = await import('../src/server/r2')
const { createStudioPublicationCover, retireStudioPublicationCover } = await import(
  '../src/server/studio-publication-cover'
)
afterEach(() => mock.restore())

test('cover creation forces no-store and exposes a URL only after atomic creation', async () => {
  const key = `studio/cover/author/${crypto.randomUUID()}/one.webp`
  const bytes = Buffer.from('image')
  const create = spyOn(storage, 'r2CreateObject').mockResolvedValue({
    key,
    url: `https://art.test/${key}`,
  })
  expect(
    await createStudioPublicationCover({
      key,
      body: bytes,
      contentType: 'image/webp',
      cacheControl: 'immutable',
    }),
  ).toEqual({ key, url: `https://art.test/${key}` })
  expect(create.mock.calls[0]?.[0]).toEqual({
    key,
    body: bytes,
    contentType: 'image/webp',
    cacheControl: 'no-store',
  })
  create.mockResolvedValue(null)
  await expect(
    createStudioPublicationCover({ key, body: bytes, contentType: 'image/webp' }),
  ).rejects.toThrow('já foi gravada ou retirada')
})

test('only Studio cover keys can be created or fenced; other uploads remain outside this protocol', async () => {
  const create = spyOn(storage, 'r2CreateObject').mockResolvedValue(null)
  const fence = spyOn(storage, 'r2FenceObject').mockResolvedValue()
  for (const key of ['avatars/a.webp', '/studio/cover/a.webp', 'studio/cover/../other.webp']) {
    await expect(
      createStudioPublicationCover({ key, body: Buffer.from('image'), contentType: 'image/webp' }),
    ).rejects.toThrow('inválida')
    await expect(retireStudioPublicationCover(key)).rejects.toThrow('inválida')
  }
  expect(create).not.toHaveBeenCalled()
  expect(fence).not.toHaveBeenCalled()
  const key = `studio/cover/author/${crypto.randomUUID()}/one.webp`
  await retireStudioPublicationCover(key)
  expect(fence).toHaveBeenCalledWith(key)
})
