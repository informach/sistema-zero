import { beforeEach, expect, test } from 'bun:test'
import '../../../pinta/src/testing/idbMock'
import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import type { PintaCausalEntry, PintaCausalResult } from '@sistemazero/core/creations/pinta-causal'
import type { LocalRegionAuthorSession } from '@sistemazero/pinta'
import { DEFAULT_MAP_BRUSH } from '../../../pinta/src/components/editor/MapTerrainPanel'
import type { PintaWorkshopAsset } from '../../../pinta/src/core/assetMemory'
import { COPY } from '../../../pinta/src/core/copy'
import { pintaLocalRevisionOf } from '../../../pinta/src/core/localAssetOrigin'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
} from '../../../pinta/src/core/project'
import {
  pintaWorkshopAssetFromJson,
  pintaWorkshopAssetToJson,
} from '../../../pinta/src/export/workshopDocument'
import { PINTA_CAUSAL_OUTBOX_KEY } from '../../../pinta/src/state/assetAuthorityKeys'
import { PINTA_CAUSAL_PIN_BLOBS_KEY } from '../../../pinta/src/state/localCausalPins'
import { isLocalRegionAsset } from '../../../pinta/src/state/localRegionAssetAuthority'
import { dbNameFor, setPintaStorageNamespace } from '../../../pinta/src/state/persistence'
import {
  createWorkshopPintaPersistence,
  workshopNativeSchema,
} from '../../../pinta/src/state/workshopPersistence'
import {
  clearIdbMock,
  idbMockDb,
  setIdbMockCodec,
  setIdbWriteGuard,
} from '../../../pinta/src/testing/idbMock'
import { expandRegionMap, prepareMapRegions } from '../../../pinta/src/tiles/regionMap'
import { cellAt, setCell } from '../../../pinta/src/tiles/tilemapOps'
import { addTile } from '../../../pinta/src/tiles/tilesetOps'
import type { CreationsCloud } from '../../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../../src/lib/creations-sync'
import {
  type PintaCausalCloud,
  PintaCausalRequestError,
  pintaCausalGzipHash,
} from '../../src/lib/pinta-causal-cloud'
import { flushPintaCausalOutbox } from '../../src/lib/pinta-causal-queue'
import {
  createCloudMirroredPintaPersistence,
  createMemoryPintaFormatMemory,
} from '../../src/lib/pinta-cloud-persistence'

// Physical IndexedDB bytes: full documents pass through the workshop codec (chunked regional
// directories), exactly the records the focal CAS reads and patches.
beforeEach(() => {
  clearIdbMock()
  setIdbMockCodec(true)
})

const gunzip = (bytes: Uint8Array<ArrayBuffer> | Blob) =>
  new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()

async function published(asset: PintaWorkshopAsset, revision: number, layout: string | null) {
  const json = pintaWorkshopAssetToJson(asset)
  if (!json) throw Error('Documento sem formato')
  const gzip = new Uint8Array(
    await new Response(
      new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer(),
  )
  const schema = workshopNativeSchema(asset)
  const entry: PintaCausalEntry = {
    itemId: asset.id,
    kind: asset.kind,
    name: asset.name,
    itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
    formatVersion: schema === 9 ? 8 : schema === 8 ? 7 : pintaWriteFormatVersion(asset.kind),
    revision,
    sha256: await pintaCausalGzipHash(gzip.buffer),
    layoutRevision: layout,
    bytes: gzip.byteLength,
    coverage: 'certified',
  }
  return { entry, gzip }
}

/** The Members graph in memory: strict epoch, bases and reads; a replay returns the same receipt. */
function causalServer(seed: readonly Awaited<ReturnType<typeof published>>[]) {
  const remote = new Map(seed.map(({ entry }) => [entry.itemId, entry]))
  const stored = new Map(seed.map(({ entry, gzip }) => [entry.itemId, gzip]))
  const receipts = new Map<string, PintaCausalResult>()
  const control = { epoch: 3, offline: false, loseReceipt: false, commits: [] as string[] }
  const transport: PintaCausalCloud = {
    snapshot: async () => ({
      epoch: String(control.epoch),
      requiredFormat: 6,
      entries: [...remote.values()],
    }),
    verifyEpoch: async () => {},
    backfill: async (): Promise<never> => {
      throw Error('Operação inesperada')
    },
    download: async ({ itemId }) => {
      const bytes = stored.get(itemId)
      if (!bytes) throw Error(`Download inesperado de ${itemId}`)
      return new Uint8Array(bytes)
    },
    upload: async ({ intent, intentHash, blobs }) => {
      if (control.offline) throw new TypeError('Failed to fetch')
      const replay = receipts.get(intent.opId)
      if (replay) return replay
      if (intent.baseEpoch !== String(control.epoch))
        throw new PintaCausalRequestError(409, 'epoch-changed')
      for (const member of intent.members)
        if ((remote.get(member.itemId)?.revision ?? 0) !== member.baseRevision)
          throw new PintaCausalRequestError(409, 'stale-base', member.itemId)
      for (const edge of intent.readSet) {
        if (edge.source !== 'snapshot') continue
        const read = remote.get(edge.targetId)
        if (
          read?.revision !== edge.revision ||
          read.sha256 !== edge.sha256 ||
          (read.layoutRevision ?? undefined) !== edge.layoutRevision
        )
          throw new PintaCausalRequestError(409, 'stale-base', edge.targetId)
      }
      control.epoch++
      const members: PintaCausalResult['members'] = []
      for (const member of intent.members) {
        if (member.action !== 'put') throw Error('fixture')
        const blob = blobs.get(member.itemId)
        if (!blob) throw Error('Candidato ausente')
        const bytes = new Uint8Array(await blob.arrayBuffer())
        if ((await pintaCausalGzipHash(bytes.buffer)) !== member.sha256) throw Error('Hash')
        const previous = remote.get(member.itemId)
        const revision = (previous?.revision ?? 0) + 1
        const layoutRevision = previous?.layoutRevision ?? null
        remote.set(member.itemId, {
          itemId: member.itemId,
          kind: member.kind,
          name: member.name,
          itemUpdatedAt: member.itemUpdatedAt,
          formatVersion: member.formatVersion,
          revision,
          sha256: member.sha256,
          layoutRevision,
          bytes: member.bytes,
          coverage: 'certified',
        })
        stored.set(member.itemId, bytes)
        members.push({
          itemId: member.itemId,
          revision,
          sha256: member.sha256,
          layoutRevision,
          deleted: false,
        })
      }
      const receipt: PintaCausalResult = {
        opId: intent.opId,
        epoch: String(control.epoch),
        intentHash,
        members,
      }
      receipts.set(intent.opId, receipt)
      control.commits.push(intent.opId)
      if (control.loseReceipt) {
        control.loseReceipt = false
        throw new TypeError('A resposta se perdeu')
      }
      return receipt
    },
  }
  return { transport, remote, stored, control }
}

/** A legacy cloud that this account never calls: the causal transport carries every write. */
function causalOnlyCloud(transport: PintaCausalCloud): CreationsCloud {
  const unused = async (): Promise<never> => {
    throw Error('Operação não solicitada')
  }
  return {
    tool: 'pinta',
    supported: true,
    pintaCausal: transport,
    list: async () => [],
    upload: unused,
    peek: async () => null,
    remove: unused,
    download: unused,
    enqueueUpload: () => {
      throw Error('Subida antiga não solicitada')
    },
    enqueueRemove: () => {},
    flush: async () => {},
    confirm: async () => {},
    getState: () => ({ status: 'idle', pending: 0, lastSavedAt: null, lastError: null }),
    getItemState: () => ({ status: 'idle', lastError: null, code: null }),
    subscribe: () => () => {},
    subscribeItems: () => () => {},
    dispose: () => {},
  }
}

/**
 * A profile adopted by the account at epoch 3: a sheet and a native 8 map of 160 × 96 cells, with
 * stored chunks far apart. The window paints with tile 1.
 */
async function adoptedAccount(namespace: string) {
  setPintaStorageNamespace(namespace)
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0)
  const converted = prepareMapRegions(
    createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 }),
  )
  if (!converted.ok) throw Error(converted.reason)
  const expanded = expandRegionMap(converted.map, { col: -64, row: -64, cols: 160, rows: 96 })
  if (!expanded.ok) throw Error(expanded.reason)
  const layer = expanded.map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada de peças ausente')
  const map: RegionTilemapAsset = setCell(
    setCell(expanded.map, layer.id, -64, -64, 1),
    layer.id,
    40,
    10,
    1,
  )
  const seed = [await published(sheet, 1, '3'), await published(map, 1, null)]
  const server = causalServer(seed)
  const local = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  expect(
    await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '3',
        transitions: [sheet, map].map((after, i) => ({
          id: after.id,
          before: null,
          beforeRevision: null,
          after,
          remote: seed[i]!.entry,
        })),
      },
      () => true,
    ),
  ).toBe(true)
  expect(idbMockDb(dbNameFor(namespace)).get(`pinta:local:document:${map.id}`)).toMatchObject({
    version: 3,
    storage: 'pinta-regions-32-v1',
  })
  const tab = (
    persistence = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true }),
  ) =>
    createCloudMirroredPintaPersistence({
      local: persistence,
      cloud: causalOnlyCloud(server.transport),
      viewerId: namespace,
      localNamespace: namespace,
      marks: createMemorySyncedMarks(),
      formatMemory: createMemoryPintaFormatMemory(),
      causal: {
        local: persistence.causal,
        reader: 7,
        writer: 7,
        holdOpen: async () => () => {},
        withClosed: (_, apply) => apply(),
      },
    })
  const flush = () =>
    flushPintaCausalOutbox({
      local: local.causal,
      cloud: server.transport,
      reader: 7,
      writer: 7,
      signal: new AbortController().signal,
    })
  return {
    namespace,
    sheet,
    sheetEntry: seed[0]!.entry,
    map,
    layerId: layer.id,
    server,
    local,
    tab,
    flush,
    db: idbMockDb(dbNameFor(namespace)),
  }
}

const paint = (session: LocalRegionAuthorSession, layerId: string, col: number, row: number) =>
  session.apply({
    tool: 'pencil',
    path: [{ col, row }],
    layerId,
    stamp: null,
    selectedTile: 1,
    brush: DEFAULT_MAP_BRUSH,
  })

async function open(
  persistence: ReturnType<Awaited<ReturnType<typeof adoptedAccount>>['tab']>,
  id: string,
) {
  if (!persistence.openRegionSession) throw Error('A conta não oferece a janela focal')
  const session = await persistence.openRegionSession(id)
  if (!session) throw Error('A janela focal não abriu')
  return session
}

async function storedMap(stored: ReadonlyMap<string, Uint8Array<ArrayBuffer>>, id: string) {
  const bytes = stored.get(id)
  if (!bytes) throw Error('Mapa ausente na conta')
  const asset = pintaWorkshopAssetFromJson(await gunzip(bytes))
  if (asset?.kind !== 'tilemap' || !isLocalRegionAsset(asset)) throw Error('Mapa ilegível na conta')
  return asset
}

test('falha do último PUT local: chunks e fila voltam juntos, e a repetição guarda a unidade certa', async () => {
  const { map, sheet, sheetEntry, layerId, server, local, tab, flush, db } =
    await adoptedAccount('focal-ultimo-put')
  const persistence = tab(local)
  const session = await open(persistence, map.id)
  try {
    const before = new Map(db)
    const quota = 'Sem espaço no aparelho'
    setIdbWriteGuard((key) => {
      if (key === PINTA_CAUSAL_OUTBOX_KEY) throw Error(quota)
    })
    // A falha real chega à criança com a frase do Pinta, nunca com o texto cru do IndexedDB.
    expect(await paint(session, layerId, 5, 5)).toMatchObject({
      ok: false,
      changed: false,
      message: COPY.scene.focal.saveError,
    })
    expect([...db.keys()].map(String).sort()).toEqual([...before.keys()].map(String).sort())
    for (const [key, value] of before) expect(db.get(key)).toBe(value)
    expect((await local.causal.inspect()).pending).toEqual([])

    setIdbWriteGuard(null)
    expect(await session.retry()).toMatchObject({ ok: true, changed: true })
    const revision = session.store.getState().revision
    const state = await local.causal.inspect()
    expect(state.pending).toHaveLength(1)
    const unit = state.pending[0]!
    expect(unit).toMatchObject({
      baseEpoch: '3',
      members: [
        {
          itemId: map.id,
          action: 'put',
          localRevision: revision,
          baseRevision: 1,
          operation: { type: 'update' },
        },
      ],
      readSet: [
        {
          source: 'snapshot',
          consumerId: map.id,
          targetId: sheet.id,
          revision: 1,
          sha256: sheetEntry.sha256,
          layoutRevision: '3',
        },
      ],
    })
    expect(state.shadows?.has(unit.opId) ?? false).toBe(false)
    expect(state.pins?.get(unit.opId)?.map(({ itemId }) => itemId)).toEqual([sheet.id])

    // The account receives the whole map: the gesture and the distant cells, at revision 2.
    await flush()
    const confirmed = await local.causal.inspect()
    expect(confirmed.pending).toEqual([])
    expect(confirmed.sealed).toBeNull()
    expect(confirmed.confirmed.get(map.id)).toMatchObject({ revision: 2, localRevision: revision })
    const uploaded = await storedMap(server.stored, map.id)
    expect(
      [
        [5, 5],
        [-64, -64],
        [40, 10],
      ].map(([col, row]) => cellAt(uploaded, layerId, col!, row!)),
    ).toEqual([1, 1, 1])
    expect(db.has(PINTA_CAUSAL_PIN_BLOBS_KEY)).toBe(false)
  } finally {
    session.close()
    persistence.dispose?.()
  }
})

test('edição concorrente em duas abas: a janela vencida é recusada sem tocar a fila', async () => {
  const { map, sheet, layerId, local, tab, namespace } = await adoptedAccount('focal-duas-abas')
  const first = tab(local)
  const secondLocal = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  const second = tab(secondLocal)
  const a = await open(first, map.id)
  const b = await open(second, map.id)
  try {
    expect(await paint(a, layerId, 5, 5)).toMatchObject({ ok: true, changed: true })
    const afterA = await local.causal.inspect()
    expect(await paint(b, layerId, 6, 6)).toMatchObject({ ok: false })
    expect(await local.causal.inspect()).toEqual(afterA)

    // The other tab reopens on top of A's revision and joins the same mutable unit.
    b.close()
    const reopened = await open(second, map.id)
    expect(await paint(reopened, layerId, 6, 6)).toMatchObject({ ok: true, changed: true })
    const joined = await local.causal.inspect()
    expect(joined.pending).toHaveLength(1)
    expect(joined.pending[0]?.opId).toBe(afterA.pending[0]?.opId)
    expect(joined.pending[0]?.preparation).not.toBe(afterA.pending[0]?.preparation)
    expect(joined.pending[0]?.members).toMatchObject([
      { itemId: map.id, localRevision: reopened.store.getState().revision, baseRevision: 1 },
    ])
    const both = await secondLocal.loadAssetById(map.id)
    if (both?.kind !== 'tilemap' || !isLocalRegionAsset(both)) throw Error('Mapa ausente')
    expect([cellAt(both, layerId, 5, 5), cellAt(both, layerId, 6, 6)]).toEqual([1, 1])

    // A whole-document save from a third tab carries the map: the late focal gesture is refused.
    const third = tab()
    const sheetRead = await local.loadAssetById(sheet.id)
    await third.persistAsset(
      { ...both, name: 'vila-nova' },
      { resources: [{ id: sheet.id, localRevision: pintaLocalRevisionOf(sheetRead!) ?? null }] },
    )
    const carried = await local.causal.inspect()
    expect(carried.pending).toHaveLength(1)
    expect(carried.shadows?.has(carried.pending[0]!.opId)).toBe(true)
    expect(await paint(reopened, layerId, 7, 7)).toMatchObject({ ok: false })
    expect(await local.causal.inspect()).toEqual(carried)
    const renamed = await local.loadAssetById(map.id)
    if (renamed?.kind !== 'tilemap' || !isLocalRegionAsset(renamed)) throw Error('Mapa ausente')
    expect(renamed.name).toBe('vila-nova')
    expect(cellAt(renamed, layerId, 7, 7)).not.toBe(1)
    third.dispose?.()
    reopened.close()
  } finally {
    a.close()
    first.dispose?.()
    second.dispose?.()
  }
})

test('rede caída: os gestos ficam na fila e sobem inteiros quando a rede volta', async () => {
  const { map, layerId, server, local, tab, flush } = await adoptedAccount('focal-sem-rede')
  const persistence = tab(local)
  const session = await open(persistence, map.id)
  try {
    server.control.offline = true
    expect(await paint(session, layerId, 5, 5)).toMatchObject({ ok: true })
    expect(await paint(session, layerId, 70, 20)).toMatchObject({ ok: true })
    await expect(flush()).rejects.toThrow('Failed to fetch')
    const sealed = await local.causal.inspect()
    expect(sealed.sealed?.local.members).toMatchObject([
      { itemId: map.id, localRevision: session.store.getState().revision },
    ])
    // Still offline, the next gesture chains after the sealed unit.
    expect(await paint(session, layerId, 6, 6)).toMatchObject({ ok: true })
    const chained = await local.causal.inspect()
    expect(chained.pending).toHaveLength(1)
    expect(chained.pending[0]).toMatchObject({
      follows: sealed.sealed?.local.opId,
      members: [{ itemId: map.id, baseAfter: { opId: sealed.sealed?.local.opId } }],
    })

    server.control.offline = false
    await flush()
    expect(server.control.commits).toEqual([sealed.sealed!.local.opId, chained.pending[0]!.opId])
    const done = await local.causal.inspect()
    expect(done.pending).toEqual([])
    expect(done.sealed).toBeNull()
    expect(done.confirmed.get(map.id)).toMatchObject({
      revision: 3,
      localRevision: session.store.getState().revision,
    })
    const uploaded = await storedMap(server.stored, map.id)
    expect(
      [
        [5, 5],
        [70, 20],
        [6, 6],
        [-64, -64],
      ].map(([col, row]) => cellAt(uploaded, layerId, col!, row!)),
    ).toEqual([1, 1, 1, 1])
    expect((await local.listAllAssets()).map(({ name }) => name).sort()).toEqual(['pecas', 'vila'])
  } finally {
    session.close()
    persistence.dispose?.()
  }
})

test('upload confirmado com recibo perdido: a repetição confirma as duas unidades sem cópia', async () => {
  const { map, layerId, server, local, tab, flush } = await adoptedAccount('focal-recibo-perdido')
  const persistence = tab(local)
  const session = await open(persistence, map.id)
  try {
    expect(await paint(session, layerId, 5, 5)).toMatchObject({ ok: true })
    server.control.loseReceipt = true
    await expect(flush()).rejects.toThrow('A resposta se perdeu')
    expect(server.remote.get(map.id)?.revision).toBe(2)
    const lost = (await local.causal.inspect()).sealed
    if (!lost) throw Error('A unidade enviada saiu da fila sem recibo')
    expect(await paint(session, layerId, 6, 6)).toMatchObject({ ok: true })

    await flush()
    // The replay returned the stored receipt; only the chained unit was a new commit.
    expect(server.control.commits).toHaveLength(2)
    expect(server.control.commits[0]).toBe(lost.local.opId)
    const done = await local.causal.inspect()
    expect(done.pending).toEqual([])
    expect(done.sealed).toBeNull()
    expect(done.confirmed.get(map.id)).toMatchObject({
      revision: 3,
      localRevision: session.store.getState().revision,
    })
    const uploaded = await storedMap(server.stored, map.id)
    expect([cellAt(uploaded, layerId, 5, 5), cellAt(uploaded, layerId, 6, 6)]).toEqual([1, 1])
    expect((await local.listAllAssets()).map(({ name }) => name).sort()).toEqual(['pecas', 'vila'])
  } finally {
    session.close()
    persistence.dispose?.()
  }
})

test('retomada integral: o aparelho reaberto continua a unidade e sobe com a folha que o mapa leu', async () => {
  const { map, sheet, sheetEntry, layerId, server, local, tab, flush, namespace } =
    await adoptedAccount('focal-retomada')
  server.control.offline = true
  const before = tab(local)
  const first = await open(before, map.id)
  expect(await paint(first, layerId, 5, 5)).toMatchObject({ ok: true })
  const opId = (await local.causal.inspect()).pending[0]?.opId
  if (!opId) throw Error('A unidade focal não entrou na fila')
  first.close()
  before.dispose?.()

  // The tab closed and reopened: new persistence objects over the same IndexedDB.
  const reopenedLocal = createWorkshopPintaPersistence({ namespace, guardCausalWrites: true })
  const after = tab(reopenedLocal)
  const files = await after.loadRetainedRecoveryFiles?.()
  const pinned = files?.get(
    `${opId}/pecas-relacionadas/${encodeURIComponent(sheet.id)}.pinta.json.gz`,
  )
  if (!pinned) throw Error('A folha lida não ficou fixada')
  const readSheet = JSON.parse(pintaWorkshopAssetToJson(sheet) ?? 'null')
  expect(JSON.parse(await gunzip(pinned))).toEqual(readSheet)
  // The same archive names the read: the sheet's revision on this device and in the account.
  const links = files?.get(`${opId}/pecas-relacionadas/revisoes-e-vinculos.json`)
  if (!links) throw Error('Vínculos da folha ausentes')
  expect(JSON.parse(await links.text())).toMatchObject({
    observedResources: [{ itemId: sheet.id, remote: { revision: 1, sha256: sheetEntry.sha256 } }],
  })
  const second = await open(after, map.id)
  expect(await paint(second, layerId, 6, 6)).toMatchObject({ ok: true })
  second.close()
  const resumed = await reopenedLocal.causal.inspect()
  expect(resumed.pending).toHaveLength(1)
  expect(resumed.pending[0]?.opId).toBe(opId)

  // A writer without the account guard changes the sheet afterwards; the unit keeps the read.
  const unguarded = createWorkshopPintaPersistence({ namespace })
  const current = await unguarded.loadAssetById(sheet.id)
  if (current?.kind !== 'tileset') throw Error('Folha ausente')
  await unguarded.persistAsset({
    ...current,
    tiles: current.tiles.map((tile, i) => {
      if (i > 0) return tile
      const data = new Uint8Array(tile.data)
      data[0] = 5
      return { ...tile, data }
    }),
  })
  const kept = await reopenedLocal.causal.pinned(opId)
  const keptSheet = kept?.blobs.get(sheet.id)
  if (!keptSheet) throw Error('Pin ausente')
  expect(JSON.parse(await gunzip(keptSheet))).toEqual(readSheet)

  server.control.offline = false
  await flush()
  expect(server.control.commits).toEqual([opId])
  const uploaded = await storedMap(server.stored, map.id)
  expect([cellAt(uploaded, layerId, 5, 5), cellAt(uploaded, layerId, 6, 6)]).toEqual([1, 1])
  expect(server.remote.get(sheet.id)?.revision).toBe(1)
  const done = await reopenedLocal.causal.inspect()
  expect(done.pending).toEqual([])
  expect(done.confirmed.get(map.id)?.revision).toBe(2)
  after.dispose?.()
})
