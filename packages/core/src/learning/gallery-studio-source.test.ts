import { expect, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  GalleryStudioSourceSchema,
  galleryStudioStorageBaseURL,
  materializeStudioGallerySnapshot,
} from './gallery-studio-source'

const bytes = (text: string) => new TextEncoder().encode(text)
const digest = (value: Uint8Array) => createHash('sha256').update(value).digest('hex')
const live = () => new AbortController()

test('part decoding owns the exact bytes verified by real asynchronous WebCrypto', async () => {
  const borrowed = bytes('{"name":"image-A"}')
  const expected = digest(borrowed)
  const realDigest = crypto.subtle.digest.bind(crypto.subtle)
  let changed = false
  // Control scheduling only: the digest and its result are the real native implementation.
  const scheduled = spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
    const pending = realDigest(algorithm, data)
    borrowed.set(bytes('{"name":"image-B"}'))
    changed = true
    return pending
  })
  try {
    const value = await materializeStudioGallerySnapshot({
      readMain: async () =>
        bytes(
          JSON.stringify({
            format: 'sz-studio-parts',
            version: 1,
            program: {},
            assets: [expected],
          }),
        ),
      readPart: async () => borrowed,
      signal: live().signal,
    })
    expect(changed).toBe(true)
    expect(value).toEqual({ assets: [{ name: 'image-A' }] })
    expect(new TextDecoder().decode(borrowed)).toBe('{"name":"image-B"}')
  } finally {
    scheduled.mockRestore()
  }
})

test('storage deployment bases permit only HTTPS or explicit development loopback without secrets', () => {
  expect(galleryStudioStorageBaseURL('https://storage.test/bucket').href).toBe(
    'https://storage.test/bucket/',
  )
  expect(galleryStudioStorageBaseURL('http://127.0.0.1:3000/bucket', true).href).toBe(
    'http://127.0.0.1:3000/bucket/',
  )
  for (const base of [
    'http://storage.test/bucket',
    'http://127.0.0.1/bucket',
    'https://user:secret@storage.test/',
    'https://storage.test/?token=secret',
    'https://storage.test/#fragment',
  ])
    expect(() => galleryStudioStorageBaseURL(base)).toThrow()
})

test('inline snapshots preserve Unicode and special JSON keys without reading parts', async () => {
  const project = JSON.parse('{"id":"project","__proto__":{"safe":true},"name":"Ação 🐢"}')
  const value = await materializeStudioGallerySnapshot({
    readMain: async () => bytes(JSON.stringify(project)),
    readPart: async () => {
      throw new Error('Unexpected part')
    },
    signal: live().signal,
  })
  expect(value).toEqual(project)
  expect(typeof value === 'object' && value !== null && Object.hasOwn(value, '__proto__')).toBe(
    true,
  )
})

test('parts hash original bytes, retain manifest order and load repeated hashes once', async () => {
  const first = bytes('{ "name": "ação", "__proto__": { "safe": true } }\n')
  const second = bytes('{"name":"outro"}')
  const h1 = digest(first),
    h2 = digest(second)
  const reads: string[] = []
  const value = await materializeStudioGallerySnapshot({
    readMain: async () =>
      bytes(
        JSON.stringify({
          format: 'sz-studio-parts',
          version: 1,
          program: { id: 'project' },
          assets: [h2, h1, h2],
        }),
      ),
    readPart: async (hash) => {
      reads.push(hash)
      return hash === h1 ? first : second
    },
    signal: live().signal,
  })
  expect(value).toEqual({
    id: 'project',
    assets: [
      JSON.parse(new TextDecoder().decode(second)),
      JSON.parse(new TextDecoder().decode(first)),
      JSON.parse(new TextDecoder().decode(second)),
    ],
  })
  expect(reads.sort()).toEqual([h1, h2].sort())
})

test.each([
  'corrupt',
  'missing',
  'utf8',
  'quota',
] as const)('refuses %s parts without dropping the image', async (mode) => {
  const asset = mode === 'utf8' ? new Uint8Array([0xff]) : bytes('{"name":"imagem"}')
  const main = bytes(
    JSON.stringify({ format: 'sz-studio-parts', version: 1, program: {}, assets: [digest(asset)] }),
  )
  await expect(
    materializeStudioGallerySnapshot({
      readMain: async () => main,
      readPart: async () => {
        if (mode === 'missing') throw new Error('Missing part')
        return mode === 'corrupt' ? bytes('{}') : asset
      },
      signal: live().signal,
      ...(mode === 'quota' ? { maxJsonBytes: main.length + asset.length - 1 } : {}),
    }),
  ).rejects.toThrow()
})

test('withdrawal owns a noncooperative main read and never dispatches a late part', async () => {
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<Uint8Array>()
  const controller = live()
  let parts = 0
  const pending = materializeStudioGallerySnapshot({
    readMain: async () => {
      entered.resolve()
      return release.promise
    },
    readPart: async () => {
      parts++
      return bytes('{}')
    },
    signal: controller.signal,
  })
  await entered.promise
  controller.abort(new DOMException('Withdrawn', 'AbortError'))
  await expect(pending).rejects.toThrow('Withdrawn')
  release.resolve(
    bytes(
      JSON.stringify({
        format: 'sz-studio-parts',
        version: 1,
        program: {},
        assets: ['a'.repeat(64)],
      }),
    ),
  )
  await Bun.sleep(5)
  expect(parts).toBe(0)
})

test('signed source references are strict and reject duplicate hashes or storage keys', () => {
  const part = {
    hash: 'a'.repeat(64),
    storageKey: 'parts/a.gz',
    url: 'https://storage.test/parts/a.gz',
  }
  const reference = {
    format: 'sz-studio-gallery-source',
    version: 1,
    itemId: 'project',
    revision: 3,
    source: { storageKey: 'project.gz', url: 'https://storage.test/project.gz' },
    parts: [part],
  }
  expect(GalleryStudioSourceSchema.safeParse(reference).success).toBe(true)
  expect(GalleryStudioSourceSchema.safeParse({ ...reference, parts: [part, part] }).success).toBe(
    false,
  )
  expect(GalleryStudioSourceSchema.safeParse({ ...reference, actor: 'forged' }).success).toBe(false)
})
