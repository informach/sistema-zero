import { expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { creationStorageKey } from '@sistemazero/core/creations'
import {
  PintaCausalAttestationSchema,
  PintaCausalBackfillAttestationSchema,
  type PintaCausalBinding,
  type PintaCausalEntry,
  type PintaCausalMember,
  pintaCausalBlobKey,
} from '@sistemazero/core/creations/pinta-causal'
import { assetToJson, createAsset } from '@sistemazero/pinta/assets'
import type { SessionUser } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { createPintaCausalRoutes } = await import('../src/routes/pinta-causal')

const userId = '11111111-1111-4111-8111-111111111111'
const accountId = '22222222-2222-4222-8222-222222222222'
const opId = '33333333-3333-4333-8333-333333333333'
const nonce = '44444444-4444-4444-8444-444444444444'
const namespace = { userId, audience: 'kids', tool: 'pinta' } as const
const current = createAsset({ kind: 'tileset', name: 'folha-causal', tileSize: 16 })
const gzip = gzipSync(assetToJson(current))
const sha256 = createHash('sha256').update(gzip).digest('hex')
const expiresAt = new Date(Date.now() + 60_000).toISOString()
const member: Extract<PintaCausalMember, { action: 'put' }> = {
  itemId: current.id,
  name: current.name,
  kind: current.kind,
  action: 'put',
  baseRevision: 0,
  formatVersion: 6,
  itemUpdatedAt: new Date(current.updatedAt).toISOString(),
  bytes: gzip.length,
  sha256,
  operation: { type: 'create' },
}
const binding: PintaCausalBinding = {
  namespace,
  opId,
  itemId: member.itemId,
  nonce,
  intentHash: 'd'.repeat(64),
  baseEpoch: '0',
  baseRevision: 0,
  revision: 1,
  baseSha256: null,
  candidateSha256: sha256,
  expiresAt,
}
const entry: PintaCausalEntry = {
  itemId: member.itemId,
  name: member.name,
  kind: member.kind,
  revision: 1,
  formatVersion: member.formatVersion,
  layoutRevision: null,
  sha256: null,
  bytes: member.bytes,
  itemUpdatedAt: member.itemUpdatedAt,
  coverage: 'unknown',
}
const sessionUser: SessionUser = {
  id: userId,
  email: '',
  firstName: '',
  lastName: '',
  role: 'customer',
  status: 'active',
  activeProfile: { accountId, name: 'Pessoa' },
}
const link = 'http://localhost/api/pinta/causal'
const context = { params: Promise.resolve({ opId }) }
const json = (endpoint: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(link + endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })

type Dependencies = Parameters<typeof createPintaCausalRoutes>[0]
const upload = pintaCausalBlobKey(binding, 'upload')
const sealed = pintaCausalBlobKey(binding, 'sealed')

function fixture(
  options: { enabled?: boolean; actor?: SessionUser; audience?: 'adult' | 'kids' } = {},
) {
  const calls: { path: string; body: unknown }[] = []
  const objects = new Map<string, Uint8Array>()
  const signing: Parameters<NonNullable<Dependencies['storage']>['presignPut']>[0][] = []
  const responses = new Map<string, unknown>()
  const historical = creationStorageKey(userId, 'pinta', member.itemId, entry.revision)
  responses.set('units/reserve', {
    status: {
      state: 'reserved',
      opId,
      intentHash: binding.intentHash,
      nextCursor: null,
      tickets: [binding],
    },
    uploadBytes: { [member.itemId]: member.bytes },
  })
  responses.set('units/member', {
    member,
    binding,
    baseStorageRef: null,
    baseEntry: null,
    remapSheetIds: [],
    remaps: [],
  })
  responses.set('units/attest', { accepted: true })
  const backfill = {
    namespace,
    itemId: entry.itemId,
    revision: 1,
    nonce,
    baseEpoch: '0',
    expiresAt,
  }
  responses.set('backfill/ticket', { binding: backfill, storageRef: historical, entry })
  responses.set('backfill/attest', { accepted: true })
  responses.set('graph/page', {
    protocol: 1,
    epoch: '0',
    requiredFormat: 6,
    entries: [entry],
    nextCursor: null,
  })
  const gateway: Dependencies['gateway'] = {
    async gatewayFetchHmac<T = unknown>(path: string, opts?: { body?: unknown }) {
      calls.push({ path, body: opts?.body })
      const endpoint = path.replace('/members/internal/creations/pinta/', '')
      return { status: 200, body: responses.get(endpoint) as T }
    },
  }
  const routes = createPintaCausalRoutes({
    gateway,
    session: {
      audience: options.audience ?? 'kids',
      getSession: async () => options.actor ?? sessionUser,
    },
    enabled: () => options.enabled ?? true,
    storage: {
      open: async (key) => {
        const value = objects.get(key)
        if (!value) return null
        return {
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(value)
              controller.close()
            },
          }),
          contentType: 'application/gzip',
          contentLength: value.byteLength,
        }
      },
      create: async (input) => {
        if (objects.has(input.key)) return false
        objects.set(input.key, input.body)
        return true
      },
      presignPut: async (input) => {
        signing.push(input)
        return 'https://storage.example/put'
      },
      presignGet: async () => 'https://storage.example/get',
    },
  })
  return { routes, calls, objects, responses, signing, historical }
}

test('the private route scope rejects profile and audience drift before any upstream call', async () => {
  const disabled = fixture({ enabled: false })
  const { routes, calls } = fixture()
  expect(
    (await disabled.routes.pintaCausalGraph.GET(new Request(`${link}/graph?reader=7`))).status,
  ).toBe(404)
  const get = (headers: Record<string, string>) =>
    routes.pintaCausalGraph.GET(new Request(`${link}/graph?reader=7`, { headers }))
  expect((await get({ 'x-sz-viewer-audience': 'adult' })).status).toBe(409)
  expect((await get({ 'x-sz-viewer': accountId })).status).toBe(409)
  expect(calls).toEqual([])
  const page = await get({ 'x-sz-viewer': userId, 'x-sz-viewer-audience': 'kids' })
  expect(page.status).toBe(200)
  expect(calls[0]?.body).toEqual({ userId, accountId, audience: 'kids', payload: { reader: 7 } })
})

test('private tickets sign an exact, expiring write-once staging PUT and hide the binding', async () => {
  const { routes, signing } = fixture()
  const result = await routes.pintaCausalReserve.POST(
    json('/units/reserve', {
      protocol: 1,
      opId,
      baseEpoch: '0',
      reader: 7,
      intentHash: binding.intentHash,
      page: 0,
      pages: 1,
      members: [member],
      readSet: [],
    }),
  )
  expect(result.status).toBe(200)
  expect(await result.json()).toMatchObject({
    tickets: [
      {
        itemId: current.id,
        revision: 1,
        method: 'PUT',
        bytes: gzip.length,
        uploadUrl: 'https://storage.example/put',
        headers: { 'content-type': 'application/gzip', 'if-none-match': '*' },
      },
    ],
  })
  expect(signing).toHaveLength(1)
  expect(signing[0]).toMatchObject({ key: upload, contentLength: gzip.length, criarUmaVez: true })
  expect(
    signing[0]!.signingDate!.getTime() + signing[0]!.expiresInSeconds! * 1000,
  ).toBeLessThanOrEqual(Date.parse(expiresAt))
})

test('the browser cannot attest, and a swapped upload never becomes a sealed candidate', async () => {
  const { routes, calls, objects } = fixture()
  const verify = (value: unknown) =>
    routes.pintaCausalVerify.POST(json(`/units/${opId}/verify`, value), context)
  expect((await verify({ itemId: member.itemId, manifest: {} })).status).toBe(400)
  expect(calls).toEqual([])
  const changed = Buffer.from(gzip)
  changed[changed.length - 1] = 255
  objects.set(upload, changed)
  expect((await verify({ itemId: member.itemId })).status).toBe(409)
  expect(objects.has(sealed)).toBe(false)
  expect(calls.some((call) => call.path.endsWith('/units/attest'))).toBe(false)

  objects.set(upload, gzip)
  expect((await verify({ itemId: member.itemId })).status).toBe(200)
  expect(objects.get(sealed)).toEqual(gzip)
  const last = calls.at(-1)?.body as { payload: unknown }
  expect(PintaCausalAttestationSchema.parse(last.payload).manifest?.sheet?.count).toBe(1)

  objects.delete(upload)
  expect((await verify({ itemId: member.itemId })).status).toBe(200)
  expect(objects.get(sealed)).toEqual(gzip)
})

test('backfill only exposes a download after it binds the exact historical gzip to the seal', async () => {
  const { routes, objects, responses, calls, historical } = fixture()
  objects.set(historical, gzip)
  responses.set('graph/item', { entry, storageRef: historical })
  const get = () =>
    routes.pintaCausalGraphItem.GET(
      new Request(`${link}/graph/items/${entry.itemId}?epoch=0&revision=1&reader=7`),
      { params: Promise.resolve({ itemId: entry.itemId }) },
    )
  expect((await get()).status).toBe(409)
  const response = await routes.pintaCausalBackfill.POST(
    json('/backfill', {
      reader: 7,
      epoch: '0',
      itemId: entry.itemId,
      revision: entry.revision,
    }),
  )
  expect(response.status).toBe(200)
  expect(objects.get(sealed)).toEqual(gzip)
  const last = calls.at(-1)?.body as { payload: unknown }
  expect(PintaCausalBackfillAttestationSchema.parse(last.payload).sha256).toBe(sha256)

  responses.set('graph/item', {
    entry: { ...entry, coverage: 'certified', sha256 },
    storageRef: sealed,
  })
  expect(await (await get()).json()).toMatchObject({
    entry: { revision: 1, sha256 },
    downloadUrl: 'https://storage.example/get',
  })
})
