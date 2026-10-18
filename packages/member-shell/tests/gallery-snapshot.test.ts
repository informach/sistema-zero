import { afterEach, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readGallerySnapshot } from '../src/lib/gallery-snapshot'

const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
})

test('teacher keeps inline Python Pro and Pinta documents readable through the shared materializer', async () => {
  for (const value of [
    {
      formatVersion: 3,
      programmingLanguage: 'python',
      kind: 'pro',
      tree: { 'main.py': { kind: 'file', content: 'print("ação")' } },
      assets: [{ id: 'drawing', name: 'herói' }],
    },
    { kind: 'pixel-sprite', name: 'Meu desenho', layers: [{ pixels: [0, 1, 2] }] },
  ]) {
    globalThis.fetch = Object.assign(
      async () => new Response(Bun.gzipSync(JSON.stringify(value))),
      { preconnect: original.preconnect },
    )
    expect(await readGallerySnapshot({ url: 'inline', parts: [] })).toEqual(value)
  }
})
test('teacher restores the saved program and exact asset parts, rejecting missing or altered images', async () => {
  const part = JSON.stringify({ id: 'dino', dataUrl: 'data:image/png;base64,AA==' }),
    hash = createHash('sha256').update(part).digest('hex')
  let corrupt = false
  globalThis.fetch = Object.assign(
    async (url: string | URL | Request) =>
      new Response(
        Bun.gzipSync(
          String(url) === 'manifest'
            ? JSON.stringify({
                format: 'sz-studio-parts',
                version: 1,
                program: { id: 'game', files: { 'script.js': 'jump()' } },
                assets: [hash],
              })
            : corrupt
              ? '{}'
              : part,
        ),
      ),
    { preconnect: original.preconnect },
  )
  const ticket = { url: 'manifest', parts: [{ hash, url: 'part' }] }
  expect(await readGallerySnapshot(ticket)).toEqual({
    id: 'game',
    files: { 'script.js': 'jump()' },
    assets: [JSON.parse(part)],
  })
  await expect(readGallerySnapshot({ ...ticket, parts: [] })).rejects.toThrow('sem uma imagem')
  corrupt = true
  await expect(readGallerySnapshot(ticket)).rejects.toThrow('corrompida')
})
