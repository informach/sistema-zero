import { expect, mock, test } from 'bun:test'
import { gzipSync } from 'node:zlib'
import { PINTA_PALETTE_LIBRARY_ITEM_ID as id } from '@sistemazero/core/creations'
import {
  pintaPaletteBlobKey,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from '@sistemazero/core/creations/pinta-palette-writer'

mock.module('server-only', () => ({}))
const { createPintaPaletteWrites } = await import('../src/routes/pinta-palette-writes')

const userId = '11111111-1111-4111-8111-111111111111'
const accountId = '22222222-2222-4222-8222-222222222222'
const nonce = '33333333-3333-4333-8333-333333333333'
const generation = '44444444-4444-4444-8444-444444444444'
const sessionId = '55555555-5555-4555-8555-555555555555'
const actor = { userId, accountId, audience: 'kids' as const }
const now = '2026-01-01T00:00:00.000Z'
const library = {
  version: 1,
  updatedAt: Date.parse(now),
  palettes: [
    {
      id: 'local',
      name: 'Minha paleta',
      colors: ['', ...Array(15).fill('#113355')],
      updatedAt: Date.parse(now),
    },
  ],
  removed: [],
}

function fixture(options: { enabled?: boolean; allowed?: boolean; expired?: boolean } = {}) {
  const content = gzipSync(JSON.stringify(library))
  const ticket = {
    protocol,
    nonce,
    baseGeneration: null,
    baseRevision: 0,
    revision: 1,
    bytes: content.length,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    itemUpdatedAt: now,
  }
  const item = {
    tool: 'pinta',
    itemId: id,
    kind: 'palette-library',
    name: 'Paletas do Pinta',
    revision: 1,
    bytes: content.length,
    thumb: null,
    syncedAt: now,
    itemUpdatedAt: now,
  }
  const known = { protocol, generation, revision: 1, adopted: true, exists: true }
  const absent = { ...known, revision: 0, exists: false }
  const receipt = { item, paletteHead: known }
  const uploadKey = pintaPaletteBlobKey(actor, ticket, 'upload')
  const sealedKey = pintaPaletteBlobKey(actor, ticket, 'sealed')
  const objects = new Map<string, Uint8Array>()
  const calls: string[] = []
  const gets: string[] = []
  let adopted = false
  let downloadKey = sealedKey
  const routes = createPintaPaletteWrites({
    enabled: () => options.enabled ?? true,
    profileAllowed: () => options.allowed ?? true,
    session: {
      audience: 'kids',
      getAccessToken: async () => 'local-verified',
      getRefreshToken: async () => 'local-renewal',
      verifyAccessToken: async () =>
        options.expired
          ? { ok: false, expired: true }
          : {
              ok: true,
              user: {
                id: userId,
                status: 'active',
                role: 'staff',
                activeProfile: { accountId },
                kids: { kind: 'student', sessionId },
              },
            },
    } as never,
    gateway: {
      refreshSession: async () => ({ state: 'unavailable' }),
      gatewayFetchHmac: async (path: string) => {
        const action = path.split('/').at(-1)!
        calls.push(action)
        if (action === 'reserve') return { status: 200, body: { ticket } }
        if (action === 'ticket')
          return {
            status: 200,
            body: adopted ? { committed: true, ...receipt } : { committed: false, ticket },
          }
        if (action === 'commit') {
          adopted = true
          return { status: 200, body: receipt }
        }
        if (action === 'head')
          return {
            status: 200,
            body: adopted
              ? {
                  paletteHead: known,
                  download: {
                    storageKey: downloadKey,
                    bytes: ticket.bytes,
                    summary: item,
                    revision: 1,
                    parts: [],
                  },
                }
              : { paletteHead: absent, download: null },
          }
        return { status: 200, body: { deleted: true, revision: 0, paletteHead: absent } }
      },
    } as never,
    storage: {
      presignGet: async (key) => {
        gets.push(key)
        return 'https://storage.test/download'
      },
      presignPut: async (input) => {
        expect(input).toMatchObject({
          key: uploadKey,
          criarUmaVez: true,
          contentLength: content.length,
        })
        expect(input.expiresInSeconds).toBeLessThanOrEqual(600)
        return 'https://storage.test/upload'
      },
      open: async (key) => {
        const data = objects.get(key)
        return data
          ? {
              body: new Blob([new Uint8Array(data)]).stream(),
              contentType: 'application/gzip',
              contentLength: data.byteLength,
              etag: 'fixture-etag',
            }
          : null
      },
      create: async ({ key, body }) => {
        if (objects.has(key)) return false
        objects.set(key, new Uint8Array(body))
        return true
      },
    },
  })
  const req = (headers: Record<string, string> = {}) =>
    new Request('https://app.test/api', {
      headers: {
        'x-sz-viewer': userId,
        'x-sz-viewer-audience': 'kids',
        'x-sz-session': sessionId,
        ...headers,
      },
    })
  return {
    routes,
    req,
    objects,
    content,
    ticket,
    uploadKey,
    sealedKey,
    calls,
    gets,
    omitStorageOwnership: () => {
      downloadKey = sealedKey.replace(userId, generation)
    },
    command: { protocol, nonce, revision: 1 },
  }
}

test('palette reservation signs only staging, seals exact bytes, and repeats a lost ACK by receipt', async () => {
  const f = fixture()
  const r = await f.routes.reserve(f.req(), {
    protocol,
    baseGeneration: null,
    baseRevision: 0,
    bytes: f.content.length,
    itemUpdatedAt: now,
  })
  expect(r.status).toBe(200)
  expect(await r.json()).toMatchObject({
    revision: 1,
    headers: { 'if-none-match': '*' },
    paletteWrite: { protocol, nonce, baseGeneration: null },
  })
  expect(await (await f.routes.commit(f.req(), f.command)).json()).toMatchObject({
    error: { code: 'PINTA_PALETTE_UPLOAD_MISSING' },
  })
  expect(f.calls).not.toContain('commit')
  f.objects.set(f.uploadKey, f.content)
  const saved = await f.routes.commit(f.req(), f.command)
  const ack = await saved.json()
  expect(saved.status).toBe(200)
  expect(ack).toMatchObject({
    paletteHead: { adopted: true, revision: 1, generation },
    paletteWrite: { nonce, protocol },
  })
  expect(Buffer.from(f.objects.get(f.sealedKey)!)).toEqual(f.content)
  f.objects.delete(f.uploadKey)
  expect(await (await f.routes.commit(f.req(), f.command)).json()).toEqual(ack)
  expect(f.calls.filter((action) => action === 'commit')).toHaveLength(1)
  expect((await f.routes.head(f.req())).status).toBe(200)
  f.omitStorageOwnership()
  expect((await f.routes.head(f.req())).status).toBe(503)
  expect(f.gets).toEqual([f.sealedKey])
})

test('malformed palette bytes and a different document date never mint a commit or private seal', async () => {
  for (const content of [
    gzipSync(JSON.stringify({ ...library, version: 2 })),
    gzipSync(JSON.stringify({ ...library, updatedAt: Date.parse(now) + 1 })),
    gzipSync(JSON.stringify({ ...library, palettes: [...library.palettes, { fake: 1 }] })),
    Buffer.concat([gzipSync(JSON.stringify(library)), gzipSync('{}')]),
  ]) {
    const f = fixture()
    f.ticket.bytes = content.length
    f.objects.set(f.uploadKey, content)
    const denied = await f.routes.commit(f.req(), f.command)
    expect(denied.status).toBe(409)
    expect(await denied.json()).toMatchObject({ error: { code: 'PINTA_PALETTE_CONTENT_INVALID' } })
    expect(f.objects.has(f.sealedKey)).toBe(false)
    expect(f.calls).toEqual(['ticket'])
  }
})

test('absence is authenticated and distinguishable from disabled negotiation', async () => {
  const f = fixture()
  const absent = await f.routes.head(f.req())
  expect(absent.status).toBe(404)
  expect(await absent.json()).toMatchObject({
    paletteHead: { protocol, generation, adopted: true, exists: false, revision: 0 },
  })
  for (const options of [{ enabled: false }, { allowed: false }, { expired: true }]) {
    const blocked = fixture(options)
    const response = await blocked.routes.head(blocked.req())
    expect(await response.json()).not.toHaveProperty('paletteHead')
    expect(blocked.calls).toEqual([])
  }
  expect(
    (await f.routes.commit(f.req({ 'x-sz-session': 'other-session' }), f.command)).status,
  ).toBe(409)
  expect(f.calls).toEqual(['head'])
})

test('an oversized upstream ticket fails before storage or proof', async () => {
  const f = fixture()
  f.ticket.bytes = 40 * 1024 * 1024 + 1
  const refused = await f.routes.commit(f.req(), f.command)
  expect(refused.status).toBe(503)
  expect(f.calls).toEqual(['ticket'])
  expect(f.objects.size).toBe(0)
})
