import { expect, mock, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import {
  type PintaCausalIntent,
  type PintaCausalMember,
  PintaCausalSnapshotPageSchema,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import { assetToJson, createAsset, type PintaAsset } from '@sistemazero/pinta/assets'
import { createApplication as createApiGateway } from '../../api-gateway/src/composition-root'
import { loadEnv as gatewayEnv } from '../../api-gateway/src/infrastructure/config/env'
import { pintaCausalRoutes } from '../../api-gateway/src/infrastructure/config/pinta-causal-routes'
import { createApplication as createMembers } from '../../members/src/composition-root'
import { loadEnv as membersEnv } from '../../members/src/infrastructure/config/env'
import {
  kidsJourneyTestTarget,
  openKidsJourneyTestDatabase,
} from '../../members/tests/db/kids-journey-database'
import { CELL_FLIP_D, CELL_FLIP_H, makeCell } from '../../pinta/src/tiles/cell'
import { addLayer, removeLayer } from '../../pinta/src/tiles/tilemapOps'
import { addTile, remapTilemapCells, removeTile } from '../../pinta/src/tiles/tilesetOps'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
const { createPintaCausalRoutes } = await import('../src/routes/pinta-causal')
const { createGatewayModule } = await import('../src/server/gateway')

const endpoint = process.env.R2_S3_ENDPOINT
const bucket = process.env.R2_UGC_BUCKET
const database = process.env.PINTA_CAUSAL_JOURNEY_DATABASE_URL
const membersPort = 5597
const gatewayPort = 5598
const bffPort = 5599
const marker = 'kids_journey_pinta_causal_bff_journey'

if (endpoint !== 'http://127.0.0.1:5578' || !bucket?.startsWith('pinta-causal-qa-') || !database)
  throw new Error('Use o armazenamento e o banco descartáveis do ensaio.')
const pg = kidsJourneyTestTarget(database)
if (pg.port !== '55553' || pg.pathname !== `/${marker}`)
  throw new Error('O ensaio requer o banco isolado indicado no roteiro.')

type Write = Extract<PintaCausalMember, { action: 'put' }>
interface Ticket {
  itemId: string
  revision: number
  uploadUrl: string
  headers: Record<string, string>
}

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const file = (asset: PintaAsset) => gzipSync(assetToJson(asset))
const nativeRead = (gz: ArrayBuffer) =>
  new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).json()

function putDescriptor(
  asset: PintaAsset,
  bytes: Buffer,
  baseRevision: number,
  operation: Write['operation'],
): Write {
  return {
    itemId: asset.id,
    name: asset.name,
    kind: asset.kind,
    baseRevision,
    action: 'put',
    itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
    bytes: bytes.length,
    sha256: sha256(bytes),
    formatVersion: 6,
    operation,
  }
}

function sample() {
  const base = createAsset({ kind: 'tileset', name: 'folha', tileSize: 16 })
  if (base.kind !== 'tileset') throw new Error('Folha inválida.')
  const sheet = { ...addTile(addTile(base, 0), 1), id: 'sheet' }
  for (const [index, bitmap] of sheet.tiles.entries()) bitmap.data[0] = index + 1
  const initialMap = createAsset({
    kind: 'tilemap',
    name: 'vila',
    tilesetId: sheet.id,
    cols: 2,
    rows: 1,
  })
  if (initialMap.kind !== 'tilemap') throw new Error('Mapa inválido.')
  const map = { ...addLayer(initialMap, 'Consumidora'), id: 'vila' }
  const layer = map.layers[1]!
  if (layer.kind === 'objects' || layer.kind === 'group') throw new Error('Camada inválida.')
  layer.cells.set([makeCell(1, CELL_FLIP_H), makeCell(2, CELL_FLIP_D)])
  return { sheet, map, consumerLayerId: layer.id }
}

test('Pinta commits the real gzip only after BFF, Gateway, Members and PostgreSQL agree on the whole unit', async () => {
  const prepared = await openKidsJourneyTestDatabase(database)
  const [server] = await prepared.sql`show server_version`
  console.info(`PostgreSQL ${server?.server_version}`)
  const internalToken = randomUUID()
  const memberShellSecret = randomUUID()
  process.env.GATEWAY_URL = `http://127.0.0.1:${gatewayPort}`
  process.env.MEMBER_SHELL_HMAC_SECRET = memberShellSecret
  process.env.PINTA_CAUSAL_CANDIDATE = '1'
  const user = {
    id: randomUUID(),
    role: 'staff',
    status: 'active',
    email: '',
    firstName: 'QA',
    lastName: 'Pinta',
    activeProfile: { accountId: randomUUID(), name: 'Pinta QA' },
  }
  const session = { audience: 'kids', getSession: async () => user } as unknown as SessionModule

  const members = await createMembers(
    membersEnv({
      NODE_ENV: 'test',
      DATABASE_URL: database,
      HOST: '127.0.0.1',
      PORT: String(membersPort),
      GATEWAY_HMAC_SECRET: randomUUID(),
      INTERNAL_API_TOKEN: internalToken,
      PINTA_CAUSAL_CANDIDATE: '1',
    }),
  )
  const gateway = await createApiGateway(
    gatewayEnv({
      NODE_ENV: 'test',
      PORT: String(gatewayPort),
      LOG_LEVEL: 'warn',
      SHUTDOWN_DRAIN_MS: '0',
      TRUST_PROXY: 'true',
      TRUSTED_PROXY_HOPS: '1',
    }),
    {
      rawConfig: {
        consumers: [
          { id: 'member-shell', hmacSecret: memberShellSecret, allowedCidrs: ['127.0.0.1/32'] },
        ],
        services: {
          members: {
            name: 'members',
            upstreamGroups: {
              default: [{ id: 'local-members', url: `http://127.0.0.1:${membersPort}` }],
            },
          },
        },
        routes: pintaCausalRoutes([
          {
            type: 'header-inject',
            options: {
              headers: { 'x-internal-token': internalToken },
            },
          },
        ]),
      },
    },
  )
  const s3 = new S3Client({
    endpoint,
    region: 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  let bffSocket: ReturnType<typeof Bun.serve> | undefined
  let gatewaySocket: ReturnType<typeof Bun.serve> | undefined
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
    await members.start()
    gatewaySocket = Bun.serve({
      hostname: '127.0.0.1',
      port: gatewayPort,
      fetch(req, socket) {
        const forwarded = new Headers(req.headers)
        const address = socket.requestIP(req)?.address
        if (!address) return new Response(null, { status: 503 })
        // This loopback listener supplies the actual verified socket address to the gateway ingress.
        forwarded.set('x-forwarded-for', address)
        return gateway.handle(new Request(req, { headers: forwarded }))
      },
    })
    const api = createPintaCausalRoutes({ gateway: createGatewayModule(session), session })
    bffSocket = Bun.serve({
      hostname: '127.0.0.1',
      port: bffPort,
      fetch(req) {
        const suffix = new URL(req.url).pathname.replace(/^\/api\/pinta\/causal\//, '')
        if (req.method === 'GET' && suffix === 'graph') return api.pintaCausalGraph.GET(req)
        if (req.method === 'POST' && suffix === 'units/reserve')
          return api.pintaCausalReserve.POST(req)
        const item = /^graph\/items\/([^/]+)$/.exec(suffix)
        if (req.method === 'GET' && item) {
          return api.pintaCausalGraphItem.GET(req, {
            params: Promise.resolve({ itemId: item[1]! }),
          })
        }
        const unit = /^units\/([^/]+)\/(verify|commit|abort)$/.exec(suffix)
        if (req.method === 'POST' && unit) {
          const context = { params: Promise.resolve({ opId: unit[1]! }) }
          if (unit[2] === 'verify') return api.pintaCausalVerify.POST(req, context)
          if (unit[2] === 'commit') return api.pintaCausalCommit.POST(req, context)
          return api.pintaCausalAbort.POST(req, context)
        }
        return new Response(null, { status: 404 })
      },
    })

    const root = `http://127.0.0.1:${bffPort}/api/pinta/causal`
    const headers = { 'x-sz-viewer': user.id, 'x-sz-viewer-audience': 'kids' }
    const get = (path: string) => fetch(root + path, { headers })
    const post = (path: string, body?: unknown) =>
      fetch(root + path, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    const pair = sample()
    const initialFiles = { sheet: file(pair.sheet), vila: file(pair.map) }
    const readSet: PintaCausalIntent['readSet'] = [
      { source: 'unit', consumerId: 'vila', targetId: 'sheet' },
    ]
    const snapshot = async () => {
      const res = await get('/graph?reader=7')
      expect(res.status).toBe(200)
      return PintaCausalSnapshotPageSchema.parse(await res.json())
    }
    const reserve = async (
      epoch: string,
      members: Write[],
      reads = readSet,
      inverseOf?: string,
    ) => {
      const intent: PintaCausalIntent = {
        protocol: 1,
        opId: randomUUID(),
        baseEpoch: epoch,
        reader: 7,
        members,
        readSet: reads,
        ...(inverseOf ? { inverseOf } : {}),
      }
      const response = await post('/units/reserve', {
        ...intent,
        page: 0,
        pages: 1,
        intentHash: await pintaCausalIntentHash(intent),
      })
      if (response.status !== 200)
        throw new Error(
          `Reserva recusada com HTTP ${response.status} ${JSON.stringify(await response.json())}`,
        )
      const value = (await response.json()) as { state: string; tickets: Ticket[] }
      expect(value.state).toBe('reserved')
      expect(value.tickets.map(({ itemId }) => itemId)).toEqual(members.map(({ itemId }) => itemId))
      return { opId: intent.opId, tickets: value.tickets }
    }
    const upload = async (ticket: Ticket, gzip: Buffer) => {
      const response = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: ticket.headers,
        body: gzip,
      })
      await response.arrayBuffer()
      return response.status
    }
    const verify = async (opId: string, itemId: string) => {
      const response = await post(`/units/${opId}/verify`, { itemId })
      if (response.status !== 200)
        throw new Error(
          `Prova recusada para ${itemId} em ${response.status} ${JSON.stringify(await response.json())}`,
        )
      expect(await response.json()).toEqual({ verified: true })
    }
    const commit = (opId: string) => post(`/units/${opId}/commit`)
    const stage = async (
      unit: { opId: string; tickets: Ticket[] },
      bytes: Record<string, Buffer>,
    ) => {
      for (const ticket of unit.tickets) {
        expect(await upload(ticket, bytes[ticket.itemId]!)).toBe(200)
        await verify(unit.opId, ticket.itemId)
      }
    }
    const item = async (itemId: string, epoch: string, revision: number) => {
      const response = await get(
        `/graph/items/${itemId}?epoch=${epoch}&revision=${revision}&reader=7`,
      )
      expect(response.status).toBe(200)
      const signed = (await response.json()) as { downloadUrl: string }
      const download = await fetch(signed.downloadUrl)
      expect(download.status).toBe(200)
      return download.arrayBuffer()
    }

    const empty = await snapshot()
    expect(empty.entries).toEqual([])
    const initial = await reserve(empty.epoch, [
      putDescriptor(pair.sheet, initialFiles.sheet, 0, { type: 'create' }),
      putDescriptor(pair.map, initialFiles.vila, 0, { type: 'create' }),
    ])
    expect(await upload(initial.tickets[0]!, initialFiles.sheet)).toBe(200)
    expect(await upload(initial.tickets[0]!, initialFiles.sheet)).toBe(412)
    await verify(initial.opId, 'sheet')
    expect((await commit(initial.opId)).status).toBe(409)
    expect(await snapshot()).toEqual(empty)
    expect(await upload(initial.tickets[1]!, initialFiles.vila)).toBe(200)
    await verify(initial.opId, 'vila')
    expect((await commit(initial.opId)).status).toBe(200)
    const before = await snapshot()
    const priorSheet = before.entries.find(({ itemId }) => itemId === 'sheet')!
    const priorMap = before.entries.find(({ itemId }) => itemId === 'vila')!
    expect(priorSheet.sha256).toBe(sha256(initialFiles.sheet))
    expect(priorMap.sha256).toBe(sha256(initialFiles.vila))

    const sheet = removeTile(pair.sheet, 0)
    const map = remapTilemapCells(pair.map, { removedAt: 0 }, pair.sheet.id)
    const files = { sheet: file(sheet), vila: file(map) }
    const sheetMember = putDescriptor(sheet, files.sheet, priorSheet.revision, {
      type: 'remap',
      oldToNew: [-1, 0, 1],
      count: 2,
    })
    const missing = await reserve(before.epoch, [sheetMember], [])
    await stage(missing, files)
    const absent = await commit(missing.opId)
    expect(absent.status).toBe(409)
    expect(await absent.json()).toMatchObject({ reason: 'missing-consumer', itemId: 'vila' })
    expect(await snapshot()).toEqual(before)
    expect((await post(`/units/${missing.opId}/abort`)).status).toBe(200)

    const remap = await reserve(before.epoch, [
      sheetMember,
      putDescriptor(map, files.vila, priorMap.revision, { type: 'update' }),
    ])
    await stage(remap, files)
    expect((await commit(remap.opId)).status).toBe(200)
    const after = await snapshot()
    const finalSheet = after.entries.find(({ itemId }) => itemId === 'sheet')!
    const finalMap = after.entries.find(({ itemId }) => itemId === 'vila')!
    expect(after.epoch).not.toBe(before.epoch)
    expect(finalSheet.layoutRevision).not.toBe(priorSheet.layoutRevision)
    const downloadedSheet = await item('sheet', after.epoch, finalSheet.revision)
    const downloadedMap = await item('vila', after.epoch, finalMap.revision)
    expect(sha256(Buffer.from(downloadedSheet))).toBe(sha256(files.sheet))
    expect(sha256(Buffer.from(downloadedMap))).toBe(sha256(files.vila))
    const decoded = (await nativeRead(downloadedMap)) as {
      assets: { layers: { cells: number[] }[] }[]
    }
    expect(decoded.assets[0]?.layers[1]?.cells).toEqual([
      makeCell(0, CELL_FLIP_H),
      makeCell(1, CELL_FLIP_D),
    ])

    const originalAgain = {
      sheet: { ...pair.sheet, updatedAt: pair.sheet.updatedAt + 5000 },
      map: { ...pair.map, updatedAt: pair.map.updatedAt + 5000 },
    }
    const restoredFiles = {
      sheet: gzipSync(assetToJson(originalAgain.sheet), { level: 1 }),
      vila: gzipSync(assetToJson(originalAgain.map), { level: 1 }),
    }
    expect(sha256(restoredFiles.sheet)).not.toBe(priorSheet.sha256)
    expect(sha256(restoredFiles.vila)).not.toBe(priorMap.sha256)
    const undo = await reserve(
      after.epoch,
      [
        putDescriptor(originalAgain.sheet, restoredFiles.sheet, finalSheet.revision, {
          type: 'remap',
          oldToNew: [1, 2],
          count: 3,
        }),
        putDescriptor(originalAgain.map, restoredFiles.vila, finalMap.revision, { type: 'update' }),
      ],
      readSet,
      remap.opId,
    )
    await stage(undo, restoredFiles)
    const restoredAck = await commit(undo.opId)
    if (!restoredAck.ok)
      throw new Error(
        `Inversa recusada em HTTP ${restoredAck.status} ${JSON.stringify(await restoredAck.json())}`,
      )
    const restored = await snapshot()
    const restoredSheet = restored.entries.find(({ itemId }) => itemId === 'sheet')!
    const restoredMap = restored.entries.find(({ itemId }) => itemId === 'vila')!
    expect(restoredSheet.sha256).toBe(sha256(restoredFiles.sheet))
    expect(restoredMap.sha256).toBe(sha256(restoredFiles.vila))

    const detachedSheet = removeTile(originalAgain.sheet, 0)
    const detachedMap = removeLayer(originalAgain.map, pair.consumerLayerId)
    const detachedFiles = { sheet: file(detachedSheet), vila: file(detachedMap) }
    const detached = await reserve(restored.epoch, [
      putDescriptor(detachedSheet, detachedFiles.sheet, restoredSheet.revision, {
        type: 'remap',
        oldToNew: [-1, 0, 1],
        count: 2,
      }),
      putDescriptor(detachedMap, detachedFiles.vila, restoredMap.revision, { type: 'update' }),
    ])
    await stage(detached, detachedFiles)
    const [storedProof] = await prepared.sql`select pending_attestation from members.creations
      where user_id=${user.id} and item_id='vila' and tool='pinta'`
    expect(storedProof?.pending_attestation?.transitions).toEqual([
      { sheetId: 'sheet', mode: 'detached' },
    ])
    expect((await commit(detached.opId)).status).toBe(200)
    const final = await snapshot()
    const owned = final.entries.find(({ itemId }) => itemId === 'vila')!
    const saved = await item('vila', final.epoch, owned.revision)
    expect(sha256(Buffer.from(saved))).toBe(sha256(detachedFiles.vila))
    expect(
      ((await nativeRead(saved)) as { assets: { layers: unknown[] }[] }).assets[0]?.layers,
    ).toHaveLength(1)
  } finally {
    await bffSocket?.stop(true)
    await gatewaySocket?.stop(true)
    await gateway.stop()
    await members.stop()
    await prepared.close()
    s3.destroy()
  }
}, 120_000)
