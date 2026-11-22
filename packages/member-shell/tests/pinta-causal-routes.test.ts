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
import { assetToJson, createAsset, isTileLayer } from '@sistemazero/pinta/assets'
import type { SessionUser } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { createPintaCausalRoutes } = await import('../src/routes/pinta-causal')
const { readPintaCausalBlob } = await import('../src/server/pinta-causal-content')

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
  const downloads: {
    key: string
    options: Parameters<NonNullable<Dependencies['storage']>['presignGet']>[1]
  }[] = []
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
      const payload = (opts?.body as { payload?: { itemId?: string } } | undefined)?.payload
      const override = payload?.itemId && responses.get(`${endpoint}:${payload.itemId}`)
      return { status: 200, body: (override ?? responses.get(endpoint)) as T }
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
      presignGet: async (key, options) => {
        downloads.push({ key, options })
        return 'https://storage.example/get'
      },
    },
  })
  return { routes, calls, objects, responses, signing, historical, downloads }
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
  expect(page.headers.get('cache-control')).toBe('private, no-store')
  expect(calls[0]?.body).toEqual({ userId, accountId, audience: 'kids', payload: { reader: 7 } })
})

test('an advertised reader beyond this BFF cannot bypass the format floor', async () => {
  const { routes, calls } = fixture()
  expect((await routes.pintaCausalGraph.GET(new Request(`${link}/graph?reader=99`))).status).toBe(
    400,
  )
  expect(
    (
      await routes.pintaCausalReserve.POST(
        json('/units/reserve', {
          protocol: 1,
          opId,
          baseEpoch: '0',
          reader: 99,
          intentHash: binding.intentHash,
          page: 0,
          pages: 1,
          members: [member],
          readSet: [],
        }),
      )
    ).status,
  ).toBe(400)
  expect(calls).toEqual([])
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

test('the historical receipt restores a tombstone using its former exact gzip', async () => {
  const { routes, objects, responses, calls } = fixture()
  const restore = { ...binding, baseRevision: 2, revision: 3 }
  const basePlan = {
    member: { ...member, baseRevision: 2, operation: { type: 'update' } },
    binding: restore,
    baseStorageRef: null,
    baseEntry: null,
    remapSheetIds: [],
    remaps: [],
    inverseOf: '55555555-5555-4555-8555-555555555555',
    inverse: { baseRevision: 2, baseSha256: null, restoredSha256: '0'.repeat(64) },
  }
  const candidateKey = pintaCausalBlobKey(restore, 'upload')
  const sealedKey = pintaCausalBlobKey(restore, 'sealed')
  objects.set(candidateKey, gzip)
  const verify = () =>
    routes.pintaCausalVerify.POST(json('/units/verify', { itemId: member.itemId }), context)
  responses.set('units/member', basePlan)
  expect((await verify()).status).toBe(409)
  expect(objects.has(sealedKey)).toBe(false)

  responses.set('units/member', {
    ...basePlan,
    inverse: { ...basePlan.inverse, restoredSha256: sha256 },
  })
  expect((await verify()).status).toBe(200)
  expect(objects.get(sealedKey)).toEqual(gzip)
  const last = calls.at(-1)?.body as { payload: unknown }
  expect(PintaCausalAttestationSchema.parse(last.payload).transitions).toEqual([])
})

test('undoing a creation checks its current immutable bytes before attesting a deletion', async () => {
  const { routes, objects, responses, calls } = fixture()
  const deletion = {
    ...binding,
    baseRevision: 1,
    revision: 2,
    baseSha256: sha256,
    candidateSha256: null,
  }
  responses.set('units/member', {
    member: { action: 'delete', itemId: member.itemId, baseRevision: 1 },
    binding: deletion,
    baseStorageRef: sealed,
    baseEntry: { ...entry, coverage: 'certified', sha256 },
    remapSheetIds: [],
    remaps: [],
    inverseOf: '55555555-5555-4555-8555-555555555555',
    inverse: { baseRevision: 1, baseSha256: sha256, restoredSha256: null },
  })
  const verify = () =>
    routes.pintaCausalVerify.POST(json('/units/verify', { itemId: member.itemId }), context)
  expect((await verify()).status).toBe(409)
  objects.set(sealed, gzip)
  expect((await verify()).status).toBe(200)
  const last = calls.at(-1)?.body as { payload: unknown }
  expect(PintaCausalAttestationSchema.parse(last.payload).manifest).toBeNull()
})

test('the adult namespace signs the account actor and derives privilege from its trusted session', async () => {
  const { activeProfile: _profile, ...adult } = sessionUser
  const { routes, calls } = fixture({ audience: 'adult', actor: { ...adult, role: 'staff' } })
  const page = await routes.pintaCausalGraph.GET(
    new Request(`${link}/graph?reader=7`, {
      headers: { 'x-sz-viewer-audience': 'adult' },
    }),
  )
  expect(page.status).toBe(200)
  expect(calls[0]?.body).toEqual({
    userId,
    accountId: userId,
    audience: 'adult',
    privileged: true,
    payload: { reader: 7 },
  })
})

test('recovery includes opaque future items only through the explicit attachment path', async () => {
  const { routes, responses, calls, historical, downloads } = fixture()
  const future = { ...entry, formatVersion: 99, coverage: 'unknown' }
  responses.set('graph/page', {
    archive: { epoch: '8', requiredFormat: 99, nextCursor: null, entries: [future] },
  })
  responses.set('graph/item', { archive: { entry: future, storageRef: historical } })

  const noDowngrade = await routes.pintaCausalGraph.GET(
    new Request(`${link}/graph?reader=7&mode=archive`),
  )
  expect(noDowngrade.status).toBe(400)
  expect(calls).toEqual([])

  const page = await routes.pintaCausalArchive.GET(
    new Request(`${link}/archive?epoch=8`, {
      headers: { 'x-sz-viewer': userId, 'x-sz-viewer-audience': 'kids' },
    }),
  )
  expect(page.status).toBe(200)
  expect(await page.json()).toEqual({
    archive: { epoch: '8', requiredFormat: 99, nextCursor: null, entries: [future] },
  })
  expect(calls[0]?.body).toMatchObject({ payload: { mode: 'archive', epoch: '8' } })

  const request = () =>
    routes.pintaCausalArchiveItem.GET(
      new Request(`${link}/archive/items/${entry.itemId}?epoch=8&revision=1`),
      { params: Promise.resolve({ itemId: entry.itemId }) },
    )
  const attachment = await request()
  expect(attachment.status).toBe(303)
  expect(attachment.headers.get('location')).toBe('https://storage.example/get')
  expect(attachment.headers.get('cache-control')).toBe('private, no-store')
  expect(downloads).toEqual([
    {
      key: historical,
      options: {
        expiresInSeconds: 300,
        responseContentType: 'application/gzip',
        responseContentDisposition: `attachment; filename="${entry.itemId}-r1.pinta.json.gz"`,
      },
    },
  ])

  responses.set('graph/item', {
    archive: { entry: future, storageRef: creationStorageKey(accountId, 'pinta', entry.itemId, 1) },
  })
  expect((await request()).status).toBe(502)
  expect(downloads).toHaveLength(1)
})

test('historical authored fingerprint allows reserialization and a new updatedAt but detects altered pixels', async () => {
  const { routes, objects, responses, calls } = fixture()
  const historical = await readPintaCausalBlob(
    {
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(gzip)
          controller.close()
        },
      }),
      contentType: 'application/gzip',
      contentLength: gzip.byteLength,
    },
    {
      itemId: current.id,
      kind: current.kind,
      formatVersion: 6,
      bytes: gzip.byteLength,
      sha256,
    },
  )
  const inverse = {
    baseRevision: 2,
    baseSha256: null,
    restoredSha256: sha256,
    restoredAuthoredFingerprint: historical.manifest.authoredFingerprint,
  }
  const attempt = async (altered: boolean) => {
    const drawing = { ...structuredClone(current), updatedAt: current.updatedAt + 5000 }
    if (altered && drawing.kind === 'tileset') drawing.tiles[0]!.data[0] = 2
    const encoded = gzipSync(assetToJson(drawing), { level: 1 })
    const sha = createHash('sha256').update(encoded).digest('hex')
    expect(sha).not.toBe(sha256)
    const candidate = { ...binding, baseRevision: 2, revision: 3, candidateSha256: sha }
    const uploadKey = pintaCausalBlobKey(candidate, 'upload')
    objects.set(uploadKey, encoded)
    responses.set('units/member', {
      member: {
        ...member,
        baseRevision: 2,
        operation: { type: 'update' },
        sha256: sha,
        bytes: encoded.length,
        itemUpdatedAt: new Date(drawing.updatedAt).toISOString(),
      },
      binding: candidate,
      baseStorageRef: null,
      baseEntry: null,
      remapSheetIds: [],
      remaps: [],
      inverseOf: '55555555-5555-4555-8555-555555555555',
      inverse,
    })
    return routes.pintaCausalVerify.POST(json('/units/verify', { itemId: member.itemId }), context)
  }
  expect((await attempt(true)).status).toBe(409)
  expect(calls.some((call) => call.path.endsWith('/units/attest'))).toBe(false)
  expect((await attempt(false)).status).toBe(200)
  const receipt = PintaCausalAttestationSchema.parse(
    (calls.at(-1)?.body as { payload: unknown }).payload,
  )
  expect(receipt.binding.candidateSha256).not.toBe(sha256)
  expect(receipt.manifest?.authoredFingerprint).toEqual(historical.manifest.authoredFingerprint)
})

test('a pin fallback reads only the related certified sheet in the same unit', async () => {
  const { routes, calls, objects, responses } = fixture()
  if (current.kind !== 'tileset') throw new Error('Fixture sem folha')
  const added = structuredClone(current.tiles[0]!)
  added.data[0] = 2
  const original = {
    ...current,
    tiles: [...current.tiles, added],
    solid: [false, false],
    platform: [false, false],
  }
  const map = createAsset({
    kind: 'tilemap',
    name: 'vila-pin',
    tilesetId: original.id,
    cols: 2,
    rows: 1,
  })
  if (map.kind !== 'tilemap') throw new Error('Fixture sem mapa')
  const tileLayer = map.layers[0]!
  if (!isTileLayer(tileLayer)) throw new Error('Camada inicial sem grade')
  tileLayer.cells.set([1, 1])
  const sample = (asset: typeof map | typeof original) => {
    const bytes = gzipSync(assetToJson(asset))
    return { bytes, sha: createHash('sha256').update(bytes).digest('hex') }
  }
  const oldMap = sample(map)
  const oldSheet = sample(original)
  const pinned = sample({
    ...map,
    tilesetId: 'snapshot',
    resources: [{ sourceId: original.id, capturedAt: 1, asset: { ...original, id: 'snapshot' } }],
  })
  const newSheet = sample({ ...original, tiles: [added], solid: [false], platform: [false] })
  const operation = { type: 'remap' as const, oldToNew: [-1, 0], count: 1 }
  const plan = (
    asset: typeof map | typeof original,
    before: ReturnType<typeof sample>,
    after: ReturnType<typeof sample>,
    op: Extract<PintaCausalMember, { action: 'put' }>['operation'],
  ) => {
    const value = {
      ...binding,
      itemId: asset.id,
      revision: 2,
      baseRevision: 1,
      baseSha256: before.sha,
      candidateSha256: after.sha,
    }
    const baseKey = pintaCausalBlobKey({ ...value, revision: 1 }, 'sealed')
    objects.set(baseKey, before.bytes)
    objects.set(pintaCausalBlobKey(value, 'upload'), after.bytes)
    return {
      binding: value,
      member: {
        ...member,
        itemId: asset.id,
        kind: asset.kind,
        name: asset.name,
        baseRevision: 1,
        bytes: after.bytes.byteLength,
        sha256: after.sha,
        operation: op,
      },
      baseEntry: {
        ...entry,
        itemId: asset.id,
        kind: asset.kind,
        name: asset.name,
        coverage: 'certified',
        sha256: before.sha,
        bytes: before.bytes.byteLength,
      },
      baseStorageRef: baseKey,
      remapSheetIds: [],
      remaps: [],
    }
  }
  const mapped = plan(map, oldMap, pinned, { type: 'update' })
  responses.set(`units/member:${map.id}`, {
    ...mapped,
    remapSheetIds: [original.id],
    remaps: [{ sheetId: original.id, operation }],
  })
  const sheetPlan = plan(original, oldSheet, newSheet, operation)
  responses.set(`units/member:${original.id}`, {
    ...sheetPlan,
    binding: { ...sheetPlan.binding, intentHash: 'c'.repeat(64) },
  })
  const verify = () =>
    routes.pintaCausalVerify.POST(json('/units/verify', { itemId: map.id }), context)
  expect((await verify()).status).toBe(409)
  expect(objects.has(pintaCausalBlobKey(mapped.binding, 'sealed'))).toBe(false)

  responses.set(`units/member:${original.id}`, sheetPlan)
  expect((await verify()).status).toBe(200)
  const proof = PintaCausalAttestationSchema.parse(
    (calls.at(-1)?.body as { payload: unknown }).payload,
  )
  expect(proof.transitions).toEqual([{ sheetId: original.id, mode: 'pinned' }])
  expect(proof.manifest?.refs).toEqual([])
})
