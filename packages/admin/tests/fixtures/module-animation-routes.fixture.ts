import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prepareAnimationFile } from '../../src/lib/animation-file'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-media-animation-signing-key-with-32-characters'
process.env.R2_PUBLIC_URL = 'https://media.test'
const prefix = 'https://media.test/admin/module-animation/'
type Put = { key: string; body: Uint8Array; contentType: string }
const puts: Put[] = []
const removed: string[] = []
const objects = new Map<string, Uint8Array>()
let failAt = 0
const actualR2 = await import('../../src/server/r2')
mock.module('@/server/r2', () => ({
  ...actualR2,
  r2PutObject: async (input: Put) => {
    puts.push(input)
    if (failAt === puts.length) throw new Error('Falha de armazenamento da fixture.')
    const url = `https://media.test/${input.key}`
    objects.set(url, new Uint8Array(input.body))
    return { key: input.key, url }
  },
  r2DeletePublicObject: async (key: string) => {
    removed.push(key)
    objects.delete(`https://media.test/${key}`)
  },
}))
let session: unknown = { id: 'admin-fixture', role: 'admin' }
const actualMedia = await import('../../src/server/media')
mock.module('@/server/media', () => ({
  ...actualMedia,
  requireMediaSession: async () => session,
}))
const { POST } = await import('../../src/app/api/media/module-animation/route')
const { GET } = await import('../../src/app/api/media/module-animation/preview/route')
const folder = resolve(import.meta.dir, '../../../../art/edisvg/exports')
const manifest = JSON.parse(readFileSync(resolve(folder, 'manifest.json'), 'utf8'))
const source = readFileSync(resolve(folder, manifest.artifacts[0].file))

function upload(name: string, bytes: Uint8Array = source) {
  const form = new FormData()
  form.set('file', new File([bytes as BlobPart], name))
  return POST(
    new Request('http://admin.test/api/media/module-animation', {
      method: 'POST',
      body: form,
      headers: { 'content-length': String(bytes.byteLength + 1000) },
    }),
  )
}
const preview = (src: string) =>
  GET(
    new Request(
      `http://admin.test/api/media/module-animation/preview?src=${encodeURIComponent(src)}`,
    ),
  )

beforeEach(() => {
  puts.length = 0
  removed.length = 0
  objects.clear()
  failAt = 0
  session = { id: 'admin-fixture', role: 'admin' }
})

describe('ediSVG upload HTTP', () => {
  test('stores verified JSON and its matching PNG under one immutable new revision', async () => {
    const response = await upload('arte.edi-animation.json')
    expect(response.status).toBe(200)
    const ref = await response.json()
    expect(ref.url).toStartWith(prefix)
    expect(ref.poster.url).toStartWith(prefix)
    expect(puts).toHaveLength(2)
    expect(puts[0]?.contentType).toBe('image/png')
    expect(puts[1]?.contentType).toBe('application/json')
    const art = prepareAnimationFile(source)
    expect(puts[0]?.body).toEqual(art.poster.bytes)
    expect(puts[1]?.body).toEqual(art.content)
    expect(ref.sha256).toBe(art.sha256)
    expect(ref.poster.sha256).toBe(art.poster.sha256)
    const first = ref.url
    const second = await (await upload('arte.edi-animation.json')).json()
    expect(second.url).not.toBe(first)
  })
  test('invalid extension and content never reach storage', async () => {
    for (const name of ['project.edisvg', 'art.riv', 'art.js'])
      expect((await upload(name)).status).toBe(400)
    expect(
      (await upload('fake.edi-animation.json', new TextEncoder().encode('export default 1')))
        .status,
    ).toBe(400)
    expect(puts).toHaveLength(0)
  })
  test('rejects absent and excessive content length before multipart parsing', async () => {
    expect((await POST(new Request('http://admin.test', { method: 'POST' }))).status).toBe(411)
    expect(
      (
        await POST(
          new Request('http://admin.test', {
            method: 'POST',
            body: 'not multipart',
            headers: { 'content-length': String(20_000_000) },
          }),
        )
      ).status,
    ).toBe(413)
    expect(puts).toHaveLength(0)
  })
  test('authorization is checked before reading or writing an upload', async () => {
    const { NextResponse } = await import('next/server')
    session = NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    expect((await upload('arte.edi-animation.json')).status).toBe(401)
    expect(puts).toHaveLength(0)
  })
  test('an incomplete upload removes only its own new keys and returns no partial reference', async () => {
    failAt = 2
    const response = await upload('arte.edi-animation.json')
    expect(response.status).toBe(500)
    expect(removed).toEqual(puts.map((value) => value.key))
    expect(objects.size).toBe(0)
  })
})

describe('ediSVG preview HTTP', () => {
  test('refuses SSRF paths before calling fetch', async () => {
    const originalFetch = globalThis.fetch
    let calls = 0
    globalThis.fetch = Object.assign(
      async () => {
        calls++
        throw new Error('unexpected upstream')
      },
      { preconnect: originalFetch.preconnect },
    )
    try {
      for (const url of [
        'http://169.254.169.254/latest/meta-data/',
        `${prefix}../private.json`,
        `${prefix}bad/animation.edi-animation.json`,
        'https://media.test.attacker.test/admin/module-animation/a',
        '',
        `${prefix}f32321f1-39fb-47bc-945f-4a9a575d06f3/animation.edi-animation.json?redirect=1`,
      ])
        expect((await preview(url)).status).toBe(400)
      expect(calls).toBe(0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
  test('loads what was really stored and serves validated JSON without following redirects', async () => {
    const ref = await (await upload('arte.edi-animation.json')).json()
    const originalFetch = globalThis.fetch
    let noRedirect = false
    globalThis.fetch = Object.assign(
      async (input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
        noRedirect = options?.redirect === 'error'
        const body = objects.get(String(input))
        return body
          ? new Response(new Uint8Array(body), { headers: { 'content-type': 'application/json' } })
          : new Response(null, { status: 404 })
      },
      { preconnect: originalFetch.preconnect },
    )
    try {
      const response = await preview(ref.url)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/json')
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(noRedirect).toBe(true)
      expect((await response.json()).document).toEqual(
        JSON.parse(prepareAnimationFile(source).content.toString('utf8')).document,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
