import { beforeEach, expect, test } from 'bun:test'
import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import {
  type PintaCausalEntry,
  type PintaCausalIntent,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import {
  pintaLocalRevisionOf,
  pintaResourceObservation,
} from '../../../pinta/src/core/localAssetOrigin'
import type { PintaAsset } from '../../../pinta/src/core/project'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  isTileLayer,
  withPintaSchemaStamp,
} from '../../../pinta/src/core/project'
import { observePintaReferences } from '../../../pinta/src/core/sceneMapClosure'
import { assetFromJson, assetToJson } from '../../../pinta/src/export/assetJson'
import { createEditorStore } from '../../../pinta/src/state/editorStore'
import { clearIdbMock, idbMockDb, setIdbWriteGuard } from '../../../pinta/src/testing/idbMock'
import { createMapObject } from '../../../pinta/src/tiles/mapObjects'
import { freezeMapTilesets, freezeObjectResource } from '../../../pinta/src/tiles/resourceVersions'
import { addObjectLayer } from '../../../pinta/src/tiles/tilemapOps'
import { remapTilesetConsumers } from '../../../pinta/src/tiles/tilesetConsumers'
import { addTile, removeTile } from '../../../pinta/src/tiles/tilesetOps'
import { cloudStatusView } from '../../src/lib/cloud-status'
import type {
  CloudCreationSummary,
  CreationsCloud,
  SnapshotProducer,
  UploadedListener,
} from '../../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../../src/lib/creations-sync'
import {
  type PintaCausalCloud,
  PintaCausalRequestError,
  pintaCausalGzipHash,
} from '../../src/lib/pinta-causal-cloud'
import { flushPintaCausalOutbox, freezePintaCausalPending } from '../../src/lib/pinta-causal-queue'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
import {
  createCloudMirroredPintaPersistence,
  createMemoryPintaFormatMemory,
} from '../../src/lib/pinta-cloud-persistence'

const { createPintaCausalPersistence, createPintaPersistence, PintaLocalConflictError } =
  await import('../../../pinta/src/state/persistence')
beforeEach(clearIdbMock)

async function cloudAsset(
  asset: PintaAsset,
  revision: number,
  layoutRevision: string | null = null,
) {
  const gzip = await new Response(
    new Blob([assetToJson(asset)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer()
  const entry: PintaCausalEntry = {
    itemId: asset.id,
    kind: asset.kind,
    name: asset.name,
    itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
    formatVersion: pintaWriteFormatVersion(asset.kind),
    revision,
    sha256: await pintaCausalGzipHash(gzip),
    layoutRevision,
    bytes: gzip.byteLength,
    coverage: 'certified',
  }
  return { entry, gzip: new Uint8Array(gzip) }
}

function fakeCloud(
  remote: ReturnType<typeof createTilemapAsset>,
  revision: number,
  beforeDownload = async () => {},
) {
  const queued: string[] = []
  const producers = new Map<string, SnapshotProducer>()
  const acknowledgements = new Map<string, UploadedListener>()
  const summary: CloudCreationSummary = {
    itemId: remote.id,
    name: remote.name,
    kind: remote.kind,
    itemUpdatedAt: remote.updatedAt,
    revision,
    bytes: 1,
    thumb: null,
    syncedAt: remote.updatedAt,
    formatVersion: 4,
  }
  const unused = async (): Promise<never> => {
    throw new Error('Operação não solicitada')
  }
  const cloud: CreationsCloud = {
    tool: 'pinta',
    supported: true,
    list: async () => [summary],
    upload: unused,
    peek: async () => null,
    remove: unused,
    download: async () => {
      await beforeDownload()
      return { json: assetToJson(remote), summary, parts: [], fetchPart: unused }
    },
    enqueueUpload: (id, produce, onUploaded) => {
      queued.push(id)
      producers.set(id, produce)
      if (onUploaded) acknowledgements.set(id, onUploaded)
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
  return { cloud, queued, producers, acknowledgements }
}

test('o leitor A conserva nativo 7 local; B só confirma a subida inteira em nuvem 6 após o commit', async () => {
  const source = createTilemapAsset({
    name: 'parede-autoral',
    cols: 2,
    rows: 2,
    tilesetId: 'tiles',
    now: 1000,
  })
  source.layers[0]!.offsetX = 0.25
  source.layers.push({
    id: 'objects',
    kind: 'objects',
    name: 'Objetos',
    visible: true,
    objects: [
      {
        id: 'wall',
        name: 'Parede',
        type: '',
        shape: 'ellipse',
        collision: true,
        x: 16,
        y: 16,
        width: 16,
        height: 16,
        properties: { vida: { type: 'int', value: 5 } },
      },
    ],
  })
  const rich = withPintaSchemaStamp(source)
  expect(rich.schema).toBe(7)
  const local = createPintaPersistence({ namespace: 'cloud-writer6' })
  const marks = createMemorySyncedMarks()
  const { cloud, producers, acknowledgements } = fakeCloud(source, 0)
  cloud.list = async () => []
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud,
    marks,
    formatMemory: createMemoryPintaFormatMemory(),
    viewerId: 'writer6',
  })
  try {
    await wrapper.persistAsset(rich)
    const saved = await local.loadAssetById(rich.id)
    const produce = producers.get(rich.id)
    expect(produce).toBeDefined()
    const declared = pintaWriteFormatVersion(rich.kind)
    if (declared === 4) {
      await expect(produce!()).rejects.toMatchObject({ code: 'CREATION_CLIENT_OUTDATED' })
      expect(marks.revision(rich.id)).toBeUndefined()
      expect(assetToJson((await local.loadAssetById(rich.id))!)).toBe(assetToJson(saved!))
      return
    }
    expect(declared).toBe(6)
    const snapshot = await produce!()
    expect(snapshot?.meta).toMatchObject({ formatVersion: 6, baseRevision: 0 })
    const imported = assetFromJson(snapshot!.json)
    expect(imported.warnings).toEqual([])
    const restored = imported.asset
    expect(restored).toMatchObject({ kind: 'tilemap', schema: 7 })
    expect(assetToJson(restored!)).toBe(assetToJson(saved!))
    expect(marks.revision(rich.id)).toBeUndefined()
    acknowledgements.get(rich.id)!({ itemId: rich.id, updatedAt: saved!.updatedAt, revision: 1 })
    expect(marks.revision(rich.id)).toBe(1)
    expect(await produce!()).toBeNull()
  } finally {
    wrapper.dispose?.()
  }
})

test('reconciliação não empresta uma revisão lida depois do snapshot, mesmo com relógios iguais', async () => {
  const initial = createTilemapAsset({
    name: 'inicial',
    cols: 2,
    rows: 2,
    tilesetId: 'tiles',
    now: 1000,
  })
  const a = createPintaPersistence({ namespace: 'cloud-race026' }),
    b = createPintaPersistence({ namespace: 'cloud-race026' })
  await a.persistAsset(initial)
  const base = await b.loadAssetById(initial.id)
  if (base?.kind !== 'tilemap') throw new Error('Mapa ausente')
  const marks = createMemorySyncedMarks()
  marks.set(initial.id, initial.updatedAt, 1)
  const remote = { ...initial, name: 'remoto', updatedAt: 2000 }
  let ran = false
  const { cloud } = fakeCloud(remote, 2, async () => {
    if (ran) return
    ran = true
    await b.persistAsset({
      ...base,
      name: 'edicao-confirmada',
      layers: base.layers.map((l) =>
        isTileLayer(l) ? { ...l, cells: new Int16Array([7, -1, -1, -1]) } : l,
      ),
    })
  })
  const memory = createMemoryPintaFormatMemory()
  memory.set(initial.id, { schema: 0, revision: 1, localRevision: pintaLocalRevisionOf(initial) })
  const wrapper = createCloudMirroredPintaPersistence({
    local: a,
    cloud,
    marks,
    formatMemory: memory,
    viewerId: 'race026',
  })
  const done = Promise.withResolvers<void>()
  wrapper.subscribe?.((event) => {
    if (event.type === 'sync-end') done.resolve()
  })
  try {
    await wrapper.listAllAssets()
    await done.promise
    expect(ran).toBe(true)
    expect((await a.loadAssetById(initial.id))?.name).toBe('edicao-confirmada')
    expect((await a.listAllAssets()).some((a) => a.name === 'remoto-copia')).toBe(true)
    const second = Promise.withResolvers<void>()
    wrapper.subscribe?.((event) => {
      if (event.type === 'sync-end') second.resolve()
    })
    // A second pass must still recognize the same-clock local edit as dirty.
    wrapper.dispose?.()
    const again = createCloudMirroredPintaPersistence({
      local: a,
      cloud,
      marks,
      formatMemory: memory,
      viewerId: 'race026-again',
    })
    again.subscribe?.((event) => {
      if (event.type === 'sync-end') second.resolve()
    })
    try {
      await again.listAllAssets()
      await second.promise
      expect(
        (await a.listAllAssets()).some(
          (a) => a.kind === 'tilemap' && a.layers.some((l) => isTileLayer(l) && l.cells[0] === 7),
        ),
      ).toBe(true)
    } finally {
      again.dispose?.()
    }
  } finally {
    wrapper.dispose?.()
  }
})

test('reinício com lápide restaura revisão remota nova no ID original', async () => {
  const initial = createTilemapAsset({ name: 'mapa', cols: 2, rows: 2, tilesetId: 'tiles', now: 1 })
  const first = createPintaPersistence({ namespace: 'cloud-delete026' })
  await first.persistAsset(initial)
  await first.deleteAsset(initial.id)
  const local = createPintaPersistence({ namespace: 'cloud-delete026' }),
    marks = createMemorySyncedMarks()
  marks.set(initial.id, 1, 2)
  marks.setTombstone(initial.id, { at: 100, sent: false, revision: 2 })
  const remote = { ...initial, name: 'remoto-revisao3', updatedAt: 200 }
  const { cloud } = fakeCloud(remote, 3)
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud,
    marks,
    formatMemory: createMemoryPintaFormatMemory(),
    viewerId: 'delete026',
  })
  const done = Promise.withResolvers<void>()
  wrapper.subscribe?.((event) => {
    if (event.type === 'sync-end') done.resolve()
  })
  try {
    await wrapper.listAllAssets()
    await done.promise
    expect((await local.loadAssetById(initial.id))?.name).toBe(remote.name)
    expect(await local.listAllAssets()).toHaveLength(1)
    expect(marks.tombstone(initial.id)).toBeUndefined()
  } finally {
    wrapper.dispose?.()
  }
})

test('conflito local enfileira somente cópias confirmadas, sem subir o original atrasado', async () => {
  const local = createPintaPersistence({ namespace: 'cloud-cas026' }),
    other = createPintaPersistence({ namespace: 'cloud-cas026' })
  const initial = createTilemapAsset({ name: 'mapa', cols: 2, rows: 2, tilesetId: 'tiles', now: 1 })
  await local.persistAsset(initial)
  const old = await local.loadAssetById(initial.id),
    fresh = await other.loadAssetById(initial.id)
  if (!old || !fresh) throw new Error('Mapa ausente')
  await other.persistAsset({ ...fresh, name: 'outra-aba' })
  const { cloud, queued } = fakeCloud(initial, 1)
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud,
    marks: createMemorySyncedMarks(),
    formatMemory: createMemoryPintaFormatMemory(),
    viewerId: 'cas026',
  })
  try {
    await expect(wrapper.persistAsset({ ...old, name: 'atrasado' })).rejects.toBeInstanceOf(
      PintaLocalConflictError,
    )
    expect(queued).toHaveLength(1)
    expect(queued).not.toContain(initial.id)
    expect((await local.loadAssetById(queued[0]!))?.name).toBe('atrasado-copia')
  } finally {
    wrapper.dispose?.()
  }
})

test('o espelho guarda dois cortes e desfaz um offline num grupo com mapa remoto ausente', async () => {
  const sheet = addTile(addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0), 1)
  const otherSheet = createTilesetAsset({ name: 'detalhes', tileSize: 16 })
  const map = createTilemapAsset({ name: 'cabana', cols: 2, rows: 2, tilesetId: sheet.id })
  const layer = map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada ausente')
  layer.cells[0] = 1
  map.layers.push({
    ...layer,
    id: 'detalhes',
    name: 'Detalhes',
    tilesetId: otherSheet.id,
    cells: new Int16Array([0, -1, -1, -1]),
  })
  const a = await cloudAsset(sheet, 1, '1')
  const b = await cloudAsset(map, 4)
  const c = await cloudAsset(otherSheet, 2, '1')
  const local = createPintaCausalPersistence({ namespace: 'cloud-remote-consumer' })
  expect(
    await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '1',
        transitions: [
          { id: sheet.id, before: null, beforeRevision: null, after: sheet, remote: a.entry },
        ],
      },
      () => true,
    ),
  ).toBe(true)
  const current = await local.loadAssetById(sheet.id)
  if (current?.kind !== 'tileset') throw Error('Folha ausente')
  expect(await local.loadAssetById(map.id)).toBeNull()
  const { cloud, queued } = fakeCloud(map, 4)
  const downloaded: string[] = []
  const unused = async (): Promise<never> => {
    throw Error('Operação não solicitada')
  }
  const transport: PintaCausalCloud = {
    snapshot: async () => ({ epoch: '1', requiredFormat: 6, entries: [a.entry, b.entry, c.entry] }),
    verifyEpoch: async (epoch) => {
      expect(epoch).toBe('1')
    },
    download: async (entry) => {
      downloaded.push(entry.itemId)
      return (entry.itemId === sheet.id ? a : entry.itemId === map.id ? b : c).gzip
    },
    backfill: unused,
    upload: unused,
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'remap',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const catalog = await wrapper.prepareTileRemap!(current)
    expect(downloaded).toEqual([map.id, otherSheet.id])
    const one = remapTilesetConsumers(catalog, [], sheet.id, { removedAt: 0 })
    if (!one.ok) throw Error('Primeiro remap recusado')
    const two = remapTilesetConsumers(catalog, one.after, sheet.id, { removedAt: 0 })
    if (!two.ok) throw Error('Segundo remap recusado')
    const root = [Symbol('A'), Symbol('B'), Symbol('C')]
    const removed = [root[2]!]
    await wrapper.persistAssets([removeTile(removeTile(current, 0), 0), ...two.after], {
      resources: [],
      layout: { oldToNew: [-1, -1, 0], count: 1 },
      slotLineage: { before: root, after: removed },
    })
    const [saved] = (await local.causal.inspect()).pending
    expect(saved?.members).toHaveLength(2)
    expect(saved?.members.find((m) => m.itemId === map.id)?.baseRevision).toBe(4)
    expect(saved?.members.find((m) => m.itemId === sheet.id)?.operation).toEqual({
      type: 'remap',
      oldToNew: [-1, -1, 0],
      count: 1,
    })
    expect(saved?.readSet).toHaveLength(2)
    expect(saved?.readSet).toEqual(
      expect.arrayContaining([
        { source: 'unit', consumerId: map.id, targetId: sheet.id },
        {
          source: 'snapshot',
          consumerId: map.id,
          targetId: otherSheet.id,
          revision: 2,
          sha256: c.entry.sha256,
          layoutRevision: '1',
        },
      ]),
    )
    const stored = await local.loadAssetById(map.id)
    const storedSheet = await local.loadAssetById(sheet.id)
    if (stored?.kind !== 'tilemap' || storedSheet?.kind !== 'tileset')
      throw Error('O grupo não foi escrito inteiro')
    expect(stored.layers.find(isTileLayer)?.cells[0]).toBe(-1)
    const reverted = removeTile(current, 0)
    const paint = new Uint8Array(reverted.tiles[1]!.data)
    paint[0] = 1
    const afterUndo = {
      ...storedSheet,
      tiles: [reverted.tiles[0]!, { ...reverted.tiles[1]!, data: paint }],
      solid: reverted.solid,
      platform: reverted.platform,
    }
    const firstMap = one.after[0]
    if (firstMap?.kind !== 'tilemap') throw Error('Mapa intermediário ausente')
    await wrapper.persistAssets([{ ...afterUndo }, { ...stored, layers: firstMap.layers }], {
      resources: [],
      layout: { oldToNew: [1], count: 2 },
      slotLineage: { before: removed, after: root.slice(1) },
    })
    const [composed] = (await local.causal.inspect()).pending
    expect(composed?.opId).toBe(saved?.opId)
    expect(composed?.members.find((m) => m.itemId === sheet.id)?.operation).toMatchObject({
      type: 'remap',
      oldToNew: [-1, 0, 1],
      count: 2,
      paintedSlots: `02${'00'.repeat(31)}`,
    })
    expect(queued).toEqual([])
    const restored = await local.loadAssetById(map.id)
    expect(restored?.kind === 'tilemap' && restored.layers.find(isTileLayer)?.cells[0]).toBe(0)
  } finally {
    wrapper.dispose?.()
  }
})

test('apagar uma criação não enviada remove só seu candidato local', async () => {
  const local = createPintaCausalPersistence({ namespace: 'discard-cloud-create' })
  const discarded = createPixelSpriteAsset({ name: 'lua', frameSize: 8 })
  const kept = createPixelSpriteAsset({ name: 'estrela', frameSize: 8 })
  const map = createTilemapAsset({ name: 'vila', tilesetId: 'pecas', cols: 2, rows: 2 })
  const { cloud, queued } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação inesperada')
  }
  const transport: PintaCausalCloud = {
    snapshot: unused,
    download: unused,
    verifyEpoch: unused,
    upload: unused,
    backfill: unused,
  }
  expect(
    await local.causal.applyPull({ fromEpoch: null, epoch: '1', transitions: [] }, () => true),
  ).toBe(true)
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'discard-create',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    await wrapper.persistAssets([discarded, kept], { resources: [] })
    const current = await local.loadAssetById(discarded.id)
    if (!current) throw Error('Criação ausente')
    await wrapper.deleteAsset(current.id, current)
    expect(await local.loadAssetById(discarded.id)).toBeNull()
    expect(await local.loadAssetById(kept.id)).toEqual(kept)
    const state = await local.causal.inspect()
    expect(state.pending[0]?.members.map(({ itemId }) => itemId)).toEqual([kept.id])
    expect(state.sealed).toBeNull()
    expect(queued).toEqual([])
  } finally {
    wrapper.dispose?.()
  }
})

test('um escritor antigo pode editar depois do candidato e as duas versões são conferidas', async () => {
  const namespace = 'cloud-pre-causal-writer'
  const local = createPintaCausalPersistence({ namespace })
  const older = createPintaPersistence({ namespace })
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0)
  const map = createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
  const archivedSheet = await cloudAsset(sheet, 1, '1')
  let archivedMap = await cloudAsset(map, 1)
  let epoch = '1'
  expect(
    await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch,
        transitions: [
          {
            id: sheet.id,
            before: null,
            beforeRevision: null,
            after: sheet,
            remote: archivedSheet.entry,
          },
          { id: map.id, before: null, beforeRevision: null, after: map, remote: archivedMap.entry },
        ],
      },
      () => true,
    ),
  ).toBe(true)
  const { cloud, queued } = fakeCloud(map, 1)
  const reports: { ids: readonly string[]; status: string }[] = []
  const unused = async (): Promise<never> => {
    throw Error('Operação inesperada')
  }
  const transport: PintaCausalCloud = {
    snapshot: async () => ({
      epoch,
      requiredFormat: 6,
      entries: [archivedSheet.entry, archivedMap.entry],
    }),
    download: async ({ itemId }) => (itemId === sheet.id ? archivedSheet.gzip : archivedMap.gzip),
    verifyEpoch: async (expected) => {
      expect(expected).toBe(epoch)
    },
    backfill: unused,
    upload: async ({ intent, intentHash, blobs }) => {
      const put = intent.members[0]
      const gzip = blobs.get(map.id)
      if (!gzip || put?.action !== 'put') throw Error('Candidato ausente')
      expect(put.name).toBe('guardada')
      epoch = '2'
      archivedMap = {
        entry: {
          ...archivedMap.entry,
          name: put.name,
          revision: 2,
          bytes: put.bytes,
          sha256: put.sha256,
        },
        gzip: new Uint8Array(await gzip.arrayBuffer()),
      }
      return {
        opId: intent.opId,
        intentHash,
        epoch,
        members: [
          { itemId: map.id, revision: 2, sha256: put.sha256, layoutRevision: null, deleted: false },
        ],
      }
    },
  }
  let editorOpen = true
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    viewerId: 'old-writer',
    reconcileMinIntervalMs: 0,
    cloud: {
      ...cloud,
      pintaCausal: transport,
      reportPintaQueue: (ids, status) => reports.push({ ids, status }),
    },
    isAssetOpen: (id) => editorOpen && id === map.id,
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  async function pull() {
    const complete = Promise.withResolvers<void>()
    const unsubscribe = wrapper.subscribe?.((event) => {
      if (event.type === 'sync-end') complete.resolve()
    })
    try {
      await wrapper.listAllAssets()
      await complete.promise
    } finally {
      unsubscribe?.()
    }
  }
  try {
    const source = await local.loadAssetById(map.id)
    const sourceSheet = await local.loadAssetById(sheet.id)
    if (source?.kind !== 'tilemap' || !sourceSheet) throw Error('Acervo incompleto')
    await wrapper.persistAsset(
      { ...source, name: 'guardada' },
      {
        resources: [{ id: sheet.id, localRevision: pintaLocalRevisionOf(sourceSheet) ?? null }],
      },
    )
    const [draft] = (await local.causal.inspect()).pending
    if (!draft) throw Error('Candidato ausente')
    expect(
      await freezePintaCausalPending(local.causal, draft.opId, new AbortController().signal),
    ).toBe(true)
    const oldCopy = await older.loadAssetById(map.id)
    if (oldCopy?.kind !== 'tilemap') throw Error('Mapa ausente')
    const oldLayers = oldCopy.layers.map((layer) =>
      isTileLayer(layer) ? { ...layer, cells: new Int16Array([1, -1, -1, -1]) } : layer,
    )
    await older.persistAsset({ ...oldCopy, name: 'outra-edicao', layers: oldLayers })
    await pull()
    expect(reports.at(-1)).toEqual({ ids: [map.id], status: 'error' })
    expect((await local.loadAssetById(map.id))?.name).toBe('outra-edicao')
    editorOpen = false
    await pull()
    const gallery = await local.listAllAssets()
    const copied = gallery.find((asset) => asset.name === 'outra-edicao-copia')
    const copiedSheet = gallery.find((asset) => asset.name === 'pecas-copia')
    if (copied?.kind !== 'tilemap' || copiedSheet?.kind !== 'tileset')
      throw Error('Cópias ausentes')
    expect(copied.tilesetId).toBe(copiedSheet.id)
    expect(copied.layers.find(isTileLayer)?.cells[0]).toBe(1)
    expect((await local.loadAssetById(sheet.id))?.name).toBe('pecas')
    expect((await local.loadAssetById(map.id))?.name).toBe('guardada')
    expect((await local.causal.inspect()).recovered?.size).toBe(2)
    expect(reports.at(-1)).toEqual({ ids: [], status: 'device-only' })
    expect(
      cloudStatusView({
        status: 'idle',
        deviceOnly: true,
        pending: 0,
        lastSavedAt: null,
        lastError: null,
      })?.label,
    ).toBe('Neste aparelho')
    expect(queued).toEqual([])
  } finally {
    wrapper.dispose?.()
  }
})

test.each([
  'expired',
  'unknown',
] as const)('recupera uma unidade terminal %s com sucessor durável', async (terminal) => {
  const local = createPintaCausalPersistence({ namespace: `cloud-terminal-${terminal}` })
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0)
  const map = createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
  const published = await Promise.all([cloudAsset(sheet, 1, '3'), cloudAsset(map, 1)])
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
          remote: published[i]!.entry,
        })),
      },
      () => true,
    ),
  ).toBe(true)
  const { cloud, queued } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação inesperada')
  }
  const changed = structuredClone(sheet)
  changed.tiles[0]!.data[0] = 3
  const newerSheet = await cloudAsset(changed, 2, '3')
  let offline = true
  let epoch = '4'
  let sealedId: string | undefined
  let sealedHash: string | undefined
  const transport: PintaCausalCloud = {
    snapshot: async () => ({
      epoch,
      requiredFormat: 6,
      entries: [epoch === '4' ? newerSheet.entry : published[0]!.entry, published[1]!.entry],
    }),
    verifyEpoch: async (expected) => {
      expect(expected).toBe(epoch)
    },
    backfill: unused,
    download: async ({ itemId }) =>
      itemId === sheet.id ? (epoch === '4' ? newerSheet : published[0]!).gzip : published[1]!.gzip,
    upload: async (candidate) => {
      if (offline) throw Error('sem rede')
      if (!sealedId || !sealedHash) throw Error('Selo local ausente')
      expect(candidate.intent.opId).toBe(sealedId)
      expect(candidate.intentHash).toBe(sealedHash)
      throw new PintaCausalRequestError(
        409,
        terminal === 'expired' ? 'operation-expired' : 'epoch-changed',
      )
    },
    settle: async ({ intent, intentHash }) => {
      if (!sealedId || !sealedHash) throw Error('Selo local ausente')
      expect(intent.opId).toBe(sealedId)
      expect(intentHash).toBe(sealedHash)
      return { state: terminal }
    },
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'terminal',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const base = await local.loadAssetById(sheet.id)
    if (base?.kind !== 'tileset') throw Error('Folha ausente')
    const paint = {
      ...base,
      tiles: base.tiles.map((tile, i) => {
        if (i > 0) return tile
        const data = new Uint8Array(tile.data)
        data[0] = 5
        return { ...tile, data }
      }),
    }
    await wrapper.persistAsset(paint, { resources: [] })
    const work = {
      local: local.causal,
      cloud: transport,
      reader: 6,
      signal: new AbortController().signal,
    }
    await expect(flushPintaCausalOutbox(work)).rejects.toThrow('sem rede')
    const sealed = await local.causal.inFlight()
    if (!sealed) throw Error('Selo ausente')
    sealedId = sealed.sealed.intent.opId
    sealedHash = sealed.sealed.intentHash
    const mapCopy = await local.loadAssetById(map.id)
    if (mapCopy?.kind !== 'tilemap') throw Error('Mapa ausente')
    await wrapper.persistAsset(
      { ...mapCopy, name: 'minha-vila' },
      {
        resources: [{ id: sheet.id, localRevision: pintaLocalRevisionOf(paint) ?? null }],
      },
    )
    const [next] = (await local.causal.inspect()).pending
    if (!next) throw Error('Sucessor ausente')
    expect(await freezePintaCausalPending(local.causal, next.opId, work.signal)).toBe(true)
    offline = false
    let opened = true
    const sync = () =>
      syncPintaCausalAccount({
        ...work,
        canContinue: () => true,
        isOpen: (id) => opened && id === map.id,
        withClosed: (ids, apply) => {
          expect(ids).toEqual(expect.arrayContaining([sheet.id, map.id]))
          return apply()
        },
      })
    await expect(sync()).rejects.toBeInstanceOf(PintaCausalRequestError)
    expect((await local.causal.inFlight())?.sealed.intent.opId).toBe(sealedId)
    opened = false

    if (terminal === 'unknown') {
      epoch = '3'
      await expect(sync()).rejects.toBeInstanceOf(PintaCausalRequestError)
      expect((await local.causal.inFlight())?.sealed.intent.opId).toBe(sealedId)
      epoch = '4'
    }
    setIdbWriteGuard((key, value) => {
      if (
        typeof key === 'string' &&
        key.startsWith('pinta:asset:') &&
        value &&
        typeof value === 'object' &&
        'name' in value &&
        value.name === 'minha-vila-copia'
      )
        throw Error('Última cópia interrompida')
    })
    try {
      await expect(sync()).rejects.toThrow('Última cópia interrompida')
    } finally {
      setIdbWriteGuard(null)
    }
    expect((await local.causal.inFlight())?.sealed.intent.opId).toBe(sealedId)
    expect(await local.causal.prepared(next.opId)).toBeTruthy()
    expect((await local.listAllAssets()).map(({ name }) => name).sort()).toEqual([
      'minha-vila',
      'pecas',
    ])
    await expect(sync()).resolves.toMatchObject({ mode: 'causal', applied: true })
    const state = await local.causal.inspect()
    expect(state.epoch).toBe('4')
    expect(state.sealed).toBeNull()
    expect(state.pending).toEqual([])
    expect(await local.causal.prepared(next.opId)).toBeNull()
    expect(state.confirmed.get(sheet.id)?.opId).toBeUndefined()
    const gallery = await local.listAllAssets()
    const copySheet = gallery.find(({ name }) => name === 'pecas-copia')
    const copyMap = gallery.find(({ name }) => name === 'minha-vila-copia')
    const official = gallery.find(({ id }) => id === sheet.id)
    if (
      copySheet?.kind !== 'tileset' ||
      official?.kind !== 'tileset' ||
      copyMap?.kind !== 'tilemap'
    )
      throw Error('Cópias ausentes')
    expect(copySheet.tiles[0]?.data[0]).toBe(5)
    expect(official.tiles[0]?.data[0]).toBe(3)
    expect(copyMap.tilesetId).toBe(copySheet.id)
    expect(queued).toEqual([])
  } finally {
    wrapper.dispose?.()
  }
})

test('o commit que vence o abort confirma o recibo exato sem criar cópia', async () => {
  const local = createPintaCausalPersistence({ namespace: 'terminal-commit-race' })
  const sprite = createPixelSpriteAsset({ name: 'lua', frameSize: 8 })
  const archived = await cloudAsset(sprite, 1)
  await local.causal.applyPull({ fromEpoch: null, epoch: '1', transitions: [] }, () => true)
  const opId = crypto.randomUUID()
  await local.causal.stage({
    opId,
    baseEpoch: '1',
    readSet: [],
    transitions: [
      {
        id: sprite.id,
        before: null,
        beforeRevision: null,
        after: sprite,
        baseRevision: 0,
        operation: { type: 'create' },
      },
    ],
  })
  let epoch = '1'
  const unused = async (): Promise<never> => {
    throw Error('Operação inesperada')
  }
  const cloud: PintaCausalCloud = {
    snapshot: async () => ({
      epoch,
      requiredFormat: 6,
      entries: epoch === '1' ? [] : [archived.entry],
    }),
    verifyEpoch: async (observed) => {
      expect(observed).toBe(epoch)
    },
    download: unused,
    backfill: unused,
    upload: async ({ blobs }) => {
      const blob = blobs.get(sprite.id)
      if (!blob) throw Error('Candidato ausente')
      archived.entry.sha256 = await pintaCausalGzipHash(await blob.arrayBuffer())
      archived.entry.bytes = blob.size
      throw new PintaCausalRequestError(409, 'epoch-changed')
    },
    settle: async ({ intent, intentHash }) => {
      const [put] = intent.members
      if (put?.action !== 'put') throw Error('Unidade ausente')
      expect(intent.opId).toBe(opId)
      if (!archived.entry.sha256) throw Error('Hash confirmado ausente')
      expect(put.sha256).toBe(archived.entry.sha256)
      epoch = '2'
      return {
        state: 'committed',
        result: {
          opId,
          epoch,
          intentHash,
          members: [
            {
              itemId: sprite.id,
              revision: 1,
              sha256: put.sha256,
              layoutRevision: null,
              deleted: false,
            },
          ],
        },
      }
    },
  }
  const result = await syncPintaCausalAccount({
    local: local.causal,
    cloud,
    reader: 6,
    signal: new AbortController().signal,
    canContinue: () => true,
    isOpen: () => false,
    withClosed: (_, apply) => apply(),
  })
  expect(result).toMatchObject({ mode: 'causal', applied: true })
  const state = await local.causal.inspect()
  expect(state.confirmed.get(sprite.id)?.opId).toBe(opId)
  expect(state.epoch).toBe('2')
  expect(state.sealed).toBeNull()
  expect((await local.listAllAssets()).map(({ id }) => id)).toEqual([sprite.id])
})

test('um ACK antigo com a mesma revisão e hora não autentica outro documento na adoção', async () => {
  const map = createTilemapAsset({ name: 'cabana', cols: 2, rows: 2, tilesetId: 'pecas', now: 10 })
  const legacy = createPintaPersistence({ namespace: 'cloud-adoption-aba' })
  await legacy.persistAsset(map)
  const local = createPintaCausalPersistence({ namespace: 'cloud-adoption-aba' })
  const current = await local.loadAssetById(map.id)
  if (current?.kind !== 'tilemap') throw Error('Mapa ausente')
  const replacement = structuredClone(map)
  replacement.layers.find(isTileLayer)!.cells[0] = 2
  const remote = await cloudAsset(replacement, 1)
  const { cloud, queued } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação não solicitada')
  }
  const transport: PintaCausalCloud = {
    snapshot: async () => ({ epoch: '1', requiredFormat: 6, entries: [remote.entry] }),
    verifyEpoch: async () => {},
    download: async () => remote.gzip,
    backfill: unused,
    upload: unused,
  }
  const legacyMarks = createMemorySyncedMarks()
  const memory = createMemoryPintaFormatMemory()
  legacyMarks.set(map.id, map.updatedAt, 1)
  memory.set(map.id, { schema: 0, revision: 1, localRevision: pintaLocalRevisionOf(current) })
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'aba',
    marks: legacyMarks,
    formatMemory: memory,
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const done = Promise.withResolvers<void>()
    wrapper.subscribe?.((event) => {
      if (event.type === 'sync-end') done.resolve()
    })
    await wrapper.listAllAssets()
    await done.promise
    expect(assetToJson((await local.loadAssetById(map.id))!)).toBe(assetToJson(current))
    expect((await local.causal.inspect()).confirmed.has(map.id)).toBe(false)
    expect(queued).toEqual([])
  } finally {
    wrapper.dispose?.()
  }
})

test('a mesma unidade vencida renova seus bytes e traduz bases do sucessor via recibo', async () => {
  const namespace = 'cloud-exact-predecessor'
  const local = createPintaCausalPersistence({ namespace })
  expect(
    await local.causal.applyPull({ fromEpoch: null, epoch: '3', transitions: [] }, () => true),
  ).toBe(true)
  const sheet = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const source = await cloudAsset(sheet, 1)
  const opId = crypto.randomUUID()
  const predecessor = await local.causal.stage({
    opId,
    baseEpoch: '3',
    readSet: [],
    transitions: [
      {
        id: sheet.id,
        before: null,
        beforeRevision: null,
        after: sheet,
        baseRevision: 0,
        operation: { type: 'create' },
      },
    ],
  })
  const put = {
    ...source.entry,
    action: 'put' as const,
    kind: sheet.kind,
    baseRevision: 0,
    sha256: source.entry.sha256!,
    operation: { type: 'create' as const },
  }
  const { revision: _rev, layoutRevision: _layout, coverage: _cov, ...member } = put
  const intent: PintaCausalIntent = {
    protocol: 1,
    baseEpoch: '3',
    reader: 6,
    opId,
    members: [member],
    readSet: [],
  }
  const frozen = new Blob([source.gzip])
  expect(
    await local.causal.seal(
      predecessor.preparation,
      intent,
      await pintaCausalIntentHash(intent),
      new Map([[sheet.id, frozen]]),
    ),
  ).toBe(true)
  const observation = {
    opId,
    localRevision: predecessor.members[0]!.localRevision,
    sha256: member.sha256,
  }
  const map = createTilemapAsset({ name: 'vila', cols: 2, rows: 2, tilesetId: sheet.id })
  const successor = await local.causal.stage({
    opId: crypto.randomUUID(),
    baseEpoch: '3',
    follows: opId,
    readSet: [
      {
        source: 'predecessor',
        consumerId: map.id,
        targetId: sheet.id,
        base: observation,
      },
    ],
    transitions: [
      {
        id: map.id,
        before: null,
        beforeRevision: null,
        after: map,
        baseRevision: 0,
        operation: { type: 'create' },
      },
    ],
  })
  const resumed = createPintaCausalPersistence({ namespace })
  let attempts = 0
  let epoch = '4'
  const cloud = {
    upload: async (unit: {
      intent: PintaCausalIntent
      intentHash: string
      blobs: ReadonlyMap<string, Blob>
    }) => {
      attempts++
      if (attempts <= 2) throw new PintaCausalRequestError(409, 'operation-expired')
      const [first] = unit.intent.members
      if (attempts === 3 && first?.action === 'put') {
        expect(first.sha256).toBe(member.sha256)
        expect(unit.intent.opId).not.toBe(opId)
        expect(new Uint8Array(await unit.blobs.get(sheet.id)!.arrayBuffer())).toEqual(source.gzip)
        return {
          opId: unit.intent.opId,
          intentHash: unit.intentHash,
          epoch: '4',
          members: [
            {
              itemId: sheet.id,
              revision: 1,
              deleted: false,
              layoutRevision: '4',
              sha256: first.sha256,
            },
          ],
        }
      }
      expect(unit.intent.opId).toBe(successor.opId)
      expect(unit.intent.baseEpoch).toBe('4')
      expect(unit.intent.readSet).toEqual([
        {
          source: 'snapshot',
          consumerId: map.id,
          targetId: sheet.id,
          revision: 1,
          layoutRevision: '4',
          sha256: member.sha256,
        },
      ])
      expect((await resumed.causal.inspect()).epoch).toBe('3')
      throw Error('Mapa ainda não enviado')
    },
    snapshot: async () => ({ epoch, requiredFormat: 6, entries: [] }),
    verifyEpoch: async (expected: string) => {
      expect(expected).toBe('3')
    },
  }
  const flush = () =>
    flushPintaCausalOutbox({
      local: resumed.causal,
      cloud,
      reader: 6,
      signal: new AbortController().signal,
    })
  await expect(flush()).rejects.toMatchObject({ reason: 'operation-expired' })
  expect((await resumed.causal.inFlight())?.sealed.intent.opId).toBe(opId)
  epoch = '3'
  await expect(flush()).rejects.toThrow('Mapa ainda não enviado')
  expect(attempts).toBe(4)
  const state = await resumed.causal.inspect()
  expect(state.epoch).toBe('3')
  expect(state.writeEpoch).toBe('4')
  expect(state.sealed?.intent.opId).toBe(successor.opId)
})

test('o primeiro save offline fica no aparelho antes de haver uma base da conta', async () => {
  const sheet = createTilesetAsset({ name: 'detalhes', tileSize: 16 })
  const map = createTilemapAsset({ name: 'vila', cols: 2, rows: 2, tilesetId: sheet.id })
  const { cloud, queued } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação não solicitada')
  }
  const local = createPintaCausalPersistence({ namespace: 'cloud-first-offline' })
  let probed = false
  const transport: PintaCausalCloud = {
    snapshot: async () => {
      probed = true
      throw new TypeError('Failed to fetch')
    },
    verifyEpoch: unused,
    download: unused,
    backfill: unused,
    upload: unused,
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'offline',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    await wrapper.persistAssets([sheet, map], { resources: [] })
    expect(probed).toBe(false)
    expect(await local.loadAssetById(sheet.id)).toEqual(sheet)
    expect(await local.loadAssetById(map.id)).toEqual(map)
    expect(queued).toEqual([])
    // The graph may announce its protocol before a baseline can safely be installed.
    await local.causal.rememberProtocol()
    const current = await local.loadAssetById(map.id)
    const resource = await local.loadAssetById(sheet.id)
    if (!current || !resource) throw Error('Mapa ausente')
    const resourceRevision = pintaLocalRevisionOf(resource)
    if (!resourceRevision) throw Error('Revisão ausente')
    await wrapper.persistAsset(
      { ...current, name: 'vila-offline' },
      {
        resources: [{ id: sheet.id, localRevision: resourceRevision }],
      },
    )
    const reopened = createPintaCausalPersistence({ namespace: 'cloud-first-offline' })
    const state = await reopened.causal.inspect()
    expect(state.epoch).toBeNull()
    expect(state.pending).toEqual([])
    expect(state.unbased?.members).toHaveLength(2)
    expect(state.unbased?.readSet).toEqual([
      {
        consumerId: map.id,
        targetId: sheet.id,
        localRevision: resourceRevision,
      },
    ])
    expect((await local.loadAssetById(map.id))?.name).toBe('vila-offline')
    expect(
      await reopened.causal.applyPull({ fromEpoch: null, epoch: '7', transitions: [] }, () => true),
    ).toBe(true)
    const reconciled = await reopened.causal.inspect()
    expect(reconciled.unbased).toBeUndefined()
    expect(reconciled.pending).toHaveLength(1)
    expect(reconciled.pending[0]?.opId).toBe(state.unbased?.opId)
    expect(reconciled.pending[0]?.baseEpoch).toBe('7')
    expect(reconciled.pending[0]?.readSet).toEqual([
      {
        source: 'unit',
        consumerId: map.id,
        targetId: sheet.id,
      },
    ])
    expect(queued).toEqual([])
  } finally {
    wrapper.dispose?.()
  }
})

test('a primeira descida recupera folha e mapa locais como uma cópia religada', async () => {
  const namespace = 'cloud-recover-first-pull'
  const initial = createPintaPersistence({ namespace })
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 16, now: 10 }), 0)
  sheet.tiles[0]!.data[0] = 1
  sheet.tiles[1]!.data[0] = 2
  const map = createTilemapAsset({ name: 'vila', cols: 2, rows: 2, tilesetId: sheet.id, now: 10 })
  map.layers.find(isTileLayer)!.cells[0] = 1
  await initial.persistAssets([sheet, map])
  const remoteSheet = { ...sheet, tiles: [...sheet.tiles].reverse(), updatedAt: 20 }
  const a = await cloudAsset(remoteSheet, 2, '2')
  const b = await cloudAsset(map, 1)
  const local = createPintaCausalPersistence({ namespace })
  const { cloud, queued } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação não solicitada')
  }
  let open = true
  const transport: PintaCausalCloud = {
    snapshot: async () => ({ epoch: '2', requiredFormat: 6, entries: [a.entry, b.entry] }),
    verifyEpoch: async () => {},
    download: async ({ itemId }) => (itemId === sheet.id ? a.gzip : b.gzip),
    backfill: unused,
    upload: unused,
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'recover',
    reconcileMinIntervalMs: 0,
    isAssetOpen: (id) => open && id === map.id,
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (ids, apply) => {
        expect(ids).toEqual(expect.arrayContaining([sheet.id, map.id]))
        return apply()
      },
    },
  })
  async function pull() {
    const complete = Promise.withResolvers<void>()
    const unsubscribe = wrapper.subscribe?.((event) => {
      if (event.type === 'sync-end') complete.resolve()
    })
    try {
      await wrapper.listAllAssets()
      await complete.promise
    } finally {
      unsubscribe?.()
    }
  }
  try {
    await pull()
    expect((await local.causal.inspect()).epoch).toBeNull()
    expect(await local.listAllAssets()).toHaveLength(2)
    open = false
    await pull()
    const gallery = await local.listAllAssets()
    expect(gallery).toHaveLength(4)
    const copy = gallery.find((a) => a.id !== map.id && a.kind === 'tilemap')
    const copiesSheet = gallery.find((a) => a.id !== sheet.id && a.kind === 'tileset')
    const official = await local.loadAssetById(sheet.id)
    if (copy?.kind !== 'tilemap' || copiesSheet?.kind !== 'tileset' || official?.kind !== 'tileset')
      throw Error('Versões incompletas')
    expect(copy.tilesetId).toBe(copiesSheet.id)
    expect(copy.layers.find(isTileLayer)?.cells[0]).toBe(1)
    expect(copiesSheet.tiles[1]?.data[0]).toBe(2)
    expect(official.tiles[1]?.data[0]).toBe(1)
    expect(copiesSheet.createdAt).toBe(sheet.createdAt)
    const state = await local.causal.inspect()
    expect(state.recovered?.size).toBe(2)
    expect(state.confirmed.get(sheet.id)?.revision).toBe(2)
    expect(state.confirmed.get(copy.id)).toBeUndefined()
    expect(state.pending).toEqual([])
    expect(queued).toEqual([])
    await wrapper.persistAsset(
      { ...copy, name: 'minha-vila' },
      {
        resources: [
          { id: copiesSheet.id, localRevision: pintaLocalRevisionOf(copiesSheet) ?? null },
        ],
      },
    )
    const edited = await local.causal.inspect()
    expect(edited.recovered?.size).toBe(0)
    expect(edited.pending[0]?.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: copy.id,
          baseRevision: 0,
          operation: { type: 'create' },
        }),
        expect.objectContaining({
          itemId: copiesSheet.id,
          baseRevision: 0,
          operation: { type: 'create' },
        }),
      ]),
    )
    expect(edited.pending[0]?.readSet).toEqual([
      {
        source: 'unit',
        consumerId: copy.id,
        targetId: copiesSheet.id,
      },
    ])
  } finally {
    wrapper.dispose?.()
  }
})

test('fixação de duas folhas, remap, pintura e fixação de arte conservam os gestos offline', async () => {
  const namespace = 'cloud-prepared-pins'
  const local = createPintaCausalPersistence({ namespace })
  const a = addTile(createTilesetAsset({ name: 'folha-a', tileSize: 16 }), 0)
  const b = createTilesetAsset({ name: 'folha-b', tileSize: 16 })
  const map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: a.id, cols: 2, rows: 2 }),
    'Arte',
  )
  const grid = map.layers.find(isTileLayer)!
  grid.cells[0] = 1
  map.layers.push({
    ...grid,
    id: 'folha-b-layer',
    tilesetId: b.id,
    cells: new Int16Array([0, -1, -1, -1]),
  })
  const objects = map.layers.find(isObjectLayer)!
  objects.objects.push(createMapObject({ id: 'porta', art: { assetId: a.id, tile: 1 } }))
  const initial = await Promise.all(
    [a, b, map].map((asset) => cloudAsset(asset, 1, asset.kind === 'tileset' ? '1' : null)),
  )
  expect(
    await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '1',
        transitions: [a, b, map].map((after, i) => ({
          id: after.id,
          before: null,
          beforeRevision: null,
          after,
          remote: initial[i]!.entry,
        })),
      },
      () => true,
    ),
  ).toBe(true)
  const { cloud, queued } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação não solicitada')
  }
  let uploads = 0
  const transport: PintaCausalCloud = {
    snapshot: async () => {
      throw new TypeError('Failed to fetch')
    },
    verifyEpoch: unused,
    download: unused,
    backfill: unused,
    upload: async () => {
      uploads++
      throw Error('sem rede')
    },
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'pins',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const sprite = createPixelSpriteAsset({ name: 'lua', frameSize: 8 })
    await wrapper.persistAsset(sprite, { resources: [] })
    await expect(
      flushPintaCausalOutbox({
        local: local.causal,
        cloud: transport,
        reader: 6,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('sem rede')
    const beforePin = await local.loadAssetById(map.id)
    const sheetA = await local.loadAssetById(a.id)
    const sheetB = await local.loadAssetById(b.id)
    if (beforePin?.kind !== 'tilemap' || sheetA?.kind !== 'tileset' || sheetB?.kind !== 'tileset')
      throw Error('Acervo incompleto')
    const pin = freezeMapTilesets(beforePin, (id) =>
      id === a.id ? sheetA : id === b.id ? sheetB : null,
    )
    if (!pin.ok) throw Error('Versões da grade não foram guardadas')
    const observe = (asset: PintaAsset) => ({
      id: asset.id,
      localRevision: pintaLocalRevisionOf(asset) ?? null,
    })
    await wrapper.persistAsset(pin.map, { resources: [observe(sheetA)] })
    const catalog = await wrapper.prepareTileRemap!(sheetA)
    const remap = remapTilesetConsumers(catalog, [], a.id, { removedAt: 0 })
    if (!remap.ok || remap.after.length !== 1) throw Error('Remap de arte ausente')
    await wrapper.persistAssets([removeTile(sheetA, 0), ...remap.after], {
      resources: [],
      layout: { oldToNew: [-1, 0], count: 1 },
    })
    const afterRemap = await local.loadAssetById(map.id)
    const resultingA = await local.loadAssetById(a.id)
    if (afterRemap?.kind !== 'tilemap' || resultingA?.kind !== 'tileset')
      throw Error('Mapa ausente')
    expect(afterRemap.tilesetId).toBe(pin.map.tilesetId)
    expect(afterRemap.layers.find(isObjectLayer)?.objects[0]?.art).toEqual({
      assetId: a.id,
      tile: 0,
    })
    const painting = {
      ...afterRemap,
      layers: afterRemap.layers.map((layer) =>
        layer.id === grid.id ? { ...layer, opacity: 0.5 } : layer,
      ),
    }
    await wrapper.persistAsset(painting, { resources: [observe(resultingA)] })
    const beforePinArt = await local.loadAssetById(map.id)
    if (beforePinArt?.kind !== 'tilemap') throw Error('Mapa ausente')
    const pinArt = freezeObjectResource(beforePinArt, objects.id, 'porta', (id) =>
      id === a.id ? resultingA : null,
    )
    if (!pinArt.ok) throw Error('Arte não foi guardada')
    await wrapper.persistAsset(pinArt.map, { resources: [] })
    const reopened = createPintaCausalPersistence({ namespace })
    const before = await reopened.causal.inspect()
    expect(before.prepared?.size).toBe(3)
    expect(before.pending).toHaveLength(4)
    expect(before.sealed?.intent.members.map((member) => member.itemId)).toEqual([sprite.id])
    expect(uploads).toBe(1)
    expect(queued).toEqual([])
    const order: string[][] = []
    const memberRevisions = new Map([
      [a.id, 1],
      [b.id, 1],
      [map.id, 1],
    ])
    let epoch = 1
    await flushPintaCausalOutbox({
      local: reopened.causal,
      reader: 6,
      signal: new AbortController().signal,
      cloud: {
        upload: async ({ intent, intentHash, blobs }) => {
          expect(intent.baseEpoch).toBe(String(epoch))
          order.push(intent.members.map((member) => member.itemId).sort())
          const mapMember = intent.members.find((member) => member.itemId === map.id)
          if (mapMember?.action === 'put') {
            const gzip = blobs.get(map.id)
            if (!gzip) throw Error('Gzip ausente')
            const json = await new Response(
              gzip.stream().pipeThrough(new DecompressionStream('gzip')),
            ).text()
            const saved = assetFromJson(json).asset
            if (saved?.kind !== 'tilemap') throw Error('Mapa inválido')
            const art = saved.layers.find(isObjectLayer)?.objects[0]?.art
            if (order.length === 2) expect(art).toEqual({ assetId: a.id, tile: 1 })
            if (order.length === 3) expect(art).toEqual({ assetId: a.id, tile: 0 })
            if (order.length === 4)
              expect(intent.readSet).toContainEqual(
                expect.objectContaining({
                  source: 'snapshot',
                  consumerId: map.id,
                  targetId: a.id,
                  revision: 2,
                }),
              )
            if (order.length === 5) {
              expect(art?.assetId).not.toBe(a.id)
              expect(saved.layers.find((layer) => layer.id === grid.id)?.opacity).toBe(0.5)
            }
          }
          return {
            opId: intent.opId,
            intentHash,
            epoch: String(++epoch),
            members: intent.members.map((member) => {
              const revision = (memberRevisions.get(member.itemId) ?? 0) + 1
              memberRevisions.set(member.itemId, revision)
              return member.action === 'put'
                ? {
                    itemId: member.itemId,
                    revision,
                    deleted: false,
                    sha256: member.sha256,
                    layoutRevision: member.itemId === a.id ? String(epoch) : null,
                  }
                : {
                    itemId: member.itemId,
                    revision,
                    deleted: true,
                    sha256: null,
                    layoutRevision: null,
                  }
            }),
          }
        },
      },
    })
    expect(order).toEqual([[sprite.id], [map.id], [a.id, map.id].sort(), [map.id], [map.id]])
    const done = await reopened.causal.inspect()
    expect(done.writeEpoch).toBe('6')
    expect(done.epoch).toBe('1')
    expect(done.pending).toEqual([])
    expect(done.prepared?.size).toBe(0)
    expect(done.sealed).toBeNull()
  } finally {
    wrapper.dispose?.()
  }
})

test('recibo de criação após compactar lápide pode confirmar a nova revisão 1', async () => {
  const local = createPintaCausalPersistence({ namespace: 'cloud-compact-tombstone' })
  const sprite = createPixelSpriteAsset({ name: 'lua', frameSize: 8 })
  const remote = (await cloudAsset(sprite, 7)).entry
  expect(
    await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '1',
        transitions: [{ id: sprite.id, before: null, beforeRevision: null, after: sprite, remote }],
      },
      () => true,
    ),
  ).toBe(true)
  const [base] = await local.causal.capture([sprite.id])
  if (!base) throw Error('Arte ausente')
  expect(
    await local.causal.applyPull(
      {
        fromEpoch: '1',
        epoch: '2',
        transitions: [{ ...base, after: null, remote: null }],
      },
      () => true,
    ),
  ).toBe(true)
  const [gone] = await local.causal.capture([sprite.id])
  if (!gone) throw Error('Lápide ausente')
  const opId = crypto.randomUUID()
  await local.causal.stage({
    opId,
    baseEpoch: '2',
    readSet: [],
    transitions: [
      {
        ...gone,
        after: { ...sprite, name: 'lua-nova' },
        baseRevision: 0,
        operation: { type: 'create' },
      },
    ],
  })
  await flushPintaCausalOutbox({
    local: local.causal,
    reader: 6,
    signal: new AbortController().signal,
    cloud: {
      upload: async ({ intent, intentHash }) => {
        const [put] = intent.members
        if (put?.action !== 'put') throw Error('Operação ausente')
        expect(put.baseRevision).toBe(0)
        return {
          opId,
          intentHash,
          epoch: '3',
          members: [
            {
              itemId: sprite.id,
              revision: 1,
              deleted: false,
              sha256: put.sha256,
              layoutRevision: null,
            },
          ],
        }
      },
    },
  })
  const state = await local.causal.inspect()
  expect(state.confirmed.get(sprite.id)).toMatchObject({ opId, revision: 1, deleted: false })
  expect(state.sealed).toBeNull()
})

test('remover peça sem leitor avança pela edição anterior de um mapa com slot estável', async () => {
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 8 }), 0)
  const map = createTilemapAsset({ name: 'cabana', cols: 1, rows: 1, tilesetId: sheet.id })
  map.layers.find(isTileLayer)!.cells[0] = 0
  const local = createPintaCausalPersistence({ namespace: 'stable-slot-follow' })
  const initial = await Promise.all([cloudAsset(sheet, 1, '1'), cloudAsset(map, 1)])
  await local.causal.applyPull(
    {
      fromEpoch: null,
      epoch: '1',
      transitions: [sheet, map].map((after, i) => ({
        id: after.id,
        before: null,
        beforeRevision: null,
        after,
        remote: initial[i]!.entry,
      })),
    },
    () => true,
  )
  const source = await local.loadAssetById(sheet.id)
  const room = await local.loadAssetById(map.id)
  if (source?.kind !== 'tileset' || room?.kind !== 'tilemap') throw Error('Acervo incompleto')
  const { cloud } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação inesperada')
  }
  const transport: PintaCausalCloud = {
    snapshot: async () => {
      throw TypeError('offline')
    },
    download: unused,
    verifyEpoch: unused,
    upload: unused,
    backfill: unused,
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'stable',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    await wrapper.persistAsset(
      { ...room, layers: room.layers.map((layer) => ({ ...layer, opacity: 0.5 })) },
      {
        resources: [{ id: sheet.id, localRevision: pintaLocalRevisionOf(source) ?? null }],
      },
    )
    const catalog = await wrapper.prepareTileRemap!(source)
    const remap = remapTilesetConsumers(catalog, [], sheet.id, { removedAt: 1 })
    if (!remap.ok) throw Error('Remap recusado')
    expect(remap.after).toEqual([])
    await wrapper.persistAssets([removeTile(source, 1)], {
      resources: [],
      layout: { oldToNew: [0, -1], count: 1 },
    })
    expect((await local.causal.inspect()).pending).toHaveLength(2)
    const order: string[] = []
    await flushPintaCausalOutbox({
      local: local.causal,
      reader: 6,
      signal: new AbortController().signal,
      cloud: {
        async upload({ intent, intentHash }) {
          const [member] = intent.members
          if (member?.action !== 'put') throw Error('Operação ausente')
          order.push(member.itemId)
          return {
            opId: intent.opId,
            intentHash,
            epoch: String(1 + order.length),
            members: [
              {
                itemId: member.itemId,
                revision: 2,
                deleted: false,
                sha256: member.sha256,
                layoutRevision: member.itemId === sheet.id ? '3' : null,
              },
            ],
          }
        },
      },
    })
    expect(order).toEqual([map.id, sheet.id])
    expect((await local.causal.inspect()).pending).toHaveLength(0)
  } finally {
    wrapper.dispose?.()
  }
})

test.each([
  false,
  true,
])('desfazer pelo editor vincula o recibo remapeado, renovação=%s', async (renew) => {
  const sheet = addTile(createTilesetAsset({ name: 'pecas', tileSize: 8 }), 0)
  const scenery = createTilesetAsset({ name: 'detalhes', tileSize: 8 })
  const map = createTilemapAsset({ name: 'cabana', cols: 1, rows: 1, tilesetId: sheet.id })
  const layer = map.layers.find(isTileLayer)!
  layer.cells[0] = 0
  map.layers.push({ ...layer, id: 'detalhe', tilesetId: scenery.id, cells: new Int16Array([0]) })
  const local = createPintaCausalPersistence({ namespace: `undo-receipt-${renew}` })
  const originals = [sheet, scenery, map]
  const initial = await Promise.all(
    originals.map((asset) => cloudAsset(asset, 1, asset.kind === 'tileset' ? '1' : null)),
  )
  await local.causal.applyPull(
    {
      fromEpoch: null,
      epoch: '1',
      transitions: originals.map((after, i) => ({
        id: after.id,
        before: null,
        beforeRevision: null,
        after,
        remote: initial[i]!.entry,
      })),
    },
    () => true,
  )
  const source = await local.loadAssetById(sheet.id)
  if (source?.kind !== 'tileset') throw Error('Folha ausente')
  const { cloud } = fakeCloud(map, 1)
  const unused = async (): Promise<never> => {
    throw Error('Operação inesperada')
  }
  const transport: PintaCausalCloud = {
    snapshot: async () => ({
      epoch: '1',
      requiredFormat: 6,
      entries: initial.map(({ entry }) => entry),
    }),
    download: unused,
    verifyEpoch: async () => {},
    upload: unused,
    backfill: unused,
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: 'undo',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const catalog = await wrapper.prepareTileRemap!(source)
    const remap = remapTilesetConsumers(catalog, [], sheet.id, { removedAt: 0 })
    if (!remap.ok) throw Error('Remap recusado')
    const editor = createEditorStore({
      asset: source,
      observeResources: (asset) => observePintaReferences(asset, catalog),
      persist: (asset, linked, layout, resources, slotLineage) =>
        wrapper.persistAssets([asset, ...linked], {
          layout,
          resources: resources ?? [],
          slotLineage,
        }),
    })
    expect(editor.getState().commitLinked(removeTile(source, 0), remap, { removedAt: 0 })).toBe(
      true,
    )
    expect(await editor.getState().flush()).toEqual({ ok: true })
    const sent: string[] = []
    await flushPintaCausalOutbox({
      local: local.causal,
      reader: 6,
      signal: new AbortController().signal,
      cloud: {
        ...transport,
        async upload({ intent, intentHash }) {
          sent.push(intent.opId)
          if (renew && sent.length === 1)
            throw new PintaCausalRequestError(409, 'operation-expired')
          return {
            opId: intent.opId,
            intentHash,
            epoch: '2',
            members: intent.members.map((member) => {
              if (member.action !== 'put') throw Error('Operação inesperada')
              return {
                itemId: member.itemId,
                revision: 2,
                deleted: false,
                sha256: member.sha256,
                layoutRevision: member.itemId === sheet.id ? '2' : null,
              }
            }),
          }
        },
      },
    })
    if (renew) expect(sent[0]).not.toBe(sent[1])
    editor.getState().undo()
    expect(await editor.getState().flush()).toEqual({ ok: true })
    const [undo] = (await local.causal.inspect()).pending
    expect(undo?.inverseOf).toBe(sent.at(-1))
    expect(undo?.readSet).toEqual(
      expect.arrayContaining([
        { source: 'unit', consumerId: map.id, targetId: sheet.id },
        {
          source: 'snapshot',
          consumerId: map.id,
          targetId: scenery.id,
          revision: 1,
          sha256: initial[1]!.entry.sha256,
          layoutRevision: '1',
        },
      ]),
    )
    const restored = await local.loadAssetById(map.id)
    expect(restored?.kind === 'tilemap' && restored.layers.find(isTileLayer)?.cells[0]).toBe(0)
  } finally {
    wrapper.dispose?.()
  }
})

test.each([
  'expired',
  'aborted',
  'unknown',
  'successor',
  'removed',
  'unbased',
  'unbased-removed',
] as const)('recupera separadamente a revisão retida e a edição de outra instalação: %s', async (mode) => {
  const namespace = `recovery-${mode}`
  const unbased = mode === 'unbased' || mode === 'unbased-removed'
  const local = createPintaCausalPersistence({ namespace })
  const old = createPintaPersistence({ namespace })
  const sheet = createTilesetAsset({ name: 'pedras', tileSize: 8, now: 1000 })
  const map = createTilemapAsset({ name: 'vila-original', cols: 2, rows: 2, tilesetId: sheet.id })
  function pixel(base: typeof sheet, value: number): typeof sheet {
    const tiles = base.tiles.map((tile) => ({ ...tile, data: tile.data.slice() }))
    tiles[0]!.data[0] = value
    return { ...base, tiles, updatedAt: 1000 + value }
  }
  const before = await cloudAsset(sheet, 1, '1')
  const cloudSeven = await cloudAsset(pixel(sheet, 7), 2, '7')
  if (unbased) await old.persistAsset(sheet)
  else
    await local.causal.applyPull(
      {
        fromEpoch: null,
        epoch: '1',
        transitions: [
          { id: sheet.id, before: null, beforeRevision: null, after: sheet, remote: before.entry },
        ],
      },
      () => true,
    )
  const { cloud, queued } = fakeCloud(map, 0)
  let offline = true
  let epoch = '1'
  const transport: PintaCausalCloud = {
    snapshot: async () => {
      if (offline) throw Error('sem rede')
      return { epoch, requiredFormat: 6, entries: [cloudSeven.entry] }
    },
    verifyEpoch: async (expected) => {
      expect(expected).toBe(epoch)
    },
    download: async () => cloudSeven.gzip,
    backfill: async () => {
      throw Error('backfill inesperado')
    },
    upload: async () => {
      if (offline) throw Error('sem rede')
      throw new PintaCausalRequestError(409, 'epoch-changed')
    },
    settle: async () => ({
      state: mode === 'expired' || mode === 'unknown' ? mode : 'aborted',
    }),
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: namespace,
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  const work = {
    local: local.causal,
    cloud: transport,
    reader: 6,
    signal: new AbortController().signal,
  }
  try {
    const base = await local.loadAssetById(sheet.id)
    if (base?.kind !== 'tileset') throw Error('Folha ausente')
    await wrapper.persistAsset(pixel(base, unbased ? 4 : 3), { resources: [] })
    if (!unbased) {
      await expect(flushPintaCausalOutbox(work)).rejects.toThrow('sem rede')
      if (mode === 'successor') {
        const loaded = await local.loadAssetById(sheet.id)
        if (loaded?.kind !== 'tileset') throw Error('Sucessor ausente')
        await wrapper.persistAsset(pixel(loaded, 4), { resources: [] })
      }
    }
  } finally {
    wrapper.dispose?.()
  }
  const fromOld = await old.loadAssetById(sheet.id)
  if (fromOld?.kind !== 'tileset') throw Error('Versão da outra instalação ausente')
  if (mode === 'removed' || mode === 'unbased-removed') await old.deleteAsset(sheet.id, fromOld)
  else await old.persistAsset(pixel(fromOld, 5))
  const reopened = createPintaCausalPersistence({ namespace })
  const prior = await reopened.causal.inspect()
  const head = prior.unbased ?? prior.pending.at(-1)
  if (head) {
    const ret = await reopened.causal.retained(head.opId)
    if (!ret) throw Error('Sombra offline ausente')
    const blob = ret.blobs.get(sheet.id)
    if (!blob) throw Error('Gzip offline ausente')
    const json = await new Response(
      blob.stream().pipeThrough(new DecompressionStream('gzip')),
    ).text()
    const asset = assetFromJson(json).asset
    if (asset?.kind !== 'tileset') throw Error('Gzip inválido')
    expect(asset.tiles[0]?.data[0]).toBe(4)
  }
  offline = false
  epoch = '2'
  await expect(
    syncPintaCausalAccount({
      ...work,
      local: reopened.causal,
      canContinue: () => true,
      isOpen: () => false,
      withClosed: (_, apply) => apply(),
    }),
  ).resolves.toMatchObject({ mode: 'causal', applied: true })
  const official = await reopened.loadAssetById(sheet.id)
  if (official?.kind !== 'tileset') throw Error('Folha oficial ausente')
  expect(official.tiles[0]?.data[0]).toBe(7)
  const copies = (await reopened.listAllAssets()).filter((item) => item.id !== sheet.id)
  expect(
    copies.map((asset) => (asset.kind === 'tileset' ? asset.tiles[0]?.data[0] : -1)).sort(),
  ).toEqual(
    mode === 'removed'
      ? [3]
      : mode === 'unbased-removed'
        ? [4]
        : mode === 'successor'
          ? [3, 4, 5]
          : unbased
            ? [4, 5]
            : [3, 5],
  )
  const settled = await reopened.causal.inspect()
  expect(settled.sealed).toBeNull()
  expect(settled.pending).toEqual([])
  expect(settled.unbased).toBeUndefined()
  expect(settled.shadows?.size ?? 0).toBe(0)
  expect(settled.recovered?.size).toBe(copies.length)
  expect(settled.confirmed.get(sheet.id)?.opId).toBeUndefined()
  expect(queued).toEqual([])
})

test.each([
  'based',
  'unbased',
] as const)('o documento e a sombra usam a mesma captura antes de codificar: %s', async (mode) => {
  const namespace = `snapshot-before-encode-${mode}`
  const local = createPintaCausalPersistence({ namespace })
  const sheet = createTilesetAsset({ name: 'pedra', tileSize: 8, now: 1000 })
  const map = createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
  if (mode === 'based')
    await local.causal.applyPull({ fromEpoch: null, epoch: '1', transitions: [] }, () => true)
  const { cloud } = fakeCloud(map, 0)
  const offline = async (): Promise<never> => {
    throw Error('sem rede')
  }
  const transport: PintaCausalCloud = {
    snapshot: offline,
    verifyEpoch: offline,
    download: offline,
    backfill: offline,
    upload: offline,
  }
  const encodeCandidates = local.causal.encodeCandidates
  let began: (() => void) | undefined
  let release: (() => void) | undefined
  const encoded = new Promise<void>((resolve) => {
    began = resolve
  })
  const waiting = new Promise<void>((resolve) => {
    release = resolve
  })
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: namespace,
    causal: {
      local: {
        ...local.causal,
        // This profile is the legacy causal store: it only ever encodes public assets.
        encodeCandidates: async (assets: readonly PintaAsset[], signal: AbortSignal) => {
          const candidate = await encodeCandidates(assets, signal)
          began?.()
          await waiting
          return candidate
        },
      },
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const saved = wrapper.persistAsset(sheet, { resources: [] })
    sheet.tiles[0]!.data[0] = 3
    await encoded
    sheet.tiles[0]!.data[0] = 4
    release?.()
    await saved
    const stored = await local.loadAssetById(sheet.id)
    const state = await local.causal.inspect()
    const draft = state.unbased ?? state.pending[0]
    if (!draft || stored?.kind !== 'tileset') throw Error('Gravação ausente')
    const candidate = await local.causal.retained(draft.opId)
    const blob = candidate?.blobs.get(sheet.id)
    if (!blob) throw Error('Sombra ausente')
    const json = await new Response(
      blob.stream().pipeThrough(new DecompressionStream('gzip')),
    ).text()
    const shadow = local.causal.decodeCandidate(json)
    if (shadow?.kind !== 'tileset') throw Error('Sombra inválida')
    expect(stored.tiles[0]?.data[0]).toBe(0)
    expect(shadow.tiles[0]?.data[0]).toBe(0)
    expect(pintaLocalRevisionOf(sheet)).toBe(pintaLocalRevisionOf(stored))
    expect(pintaResourceObservation(sheet)).toBeNull()
    // A edição feita depois segue a mesma linhagem, agora com o último valor.
    await wrapper.persistAsset(sheet, { resources: [] })
    const latest = await local.loadAssetById(sheet.id)
    expect(latest?.kind === 'tileset' && latest.tiles[0]?.data[0]).toBe(4)
    expect(pintaResourceObservation(sheet)?.localRevision).toBe(pintaLocalRevisionOf(sheet))
  } finally {
    release?.()
    wrapper.dispose?.()
  }
})

test.each([
  'fila-antiga',
  'retencao-v4',
  'porta-v4',
] as const)('recuperação da folha observada pelo mapa: %s', async (mode) => {
  const namespace = `lost-historical-resource-${mode}`
  const local = createPintaCausalPersistence({ namespace })
  const legacy = createPintaPersistence({ namespace })
  const sheet = createTilesetAsset({ name: 'pecas', tileSize: 8, now: 10 })
  const nested = mode === 'porta-v4'
  const detail = createTilesetAsset({ name: 'piso', tileSize: 8, now: 10 })
  const cabin = createTilemapAsset({
    name: 'cabana',
    tilesetId: sheet.id,
    cols: 2,
    rows: 2,
    now: 10,
  })
  const village = createTilemapAsset({
    name: 'vila',
    tilesetId: nested ? detail.id : sheet.id,
    cols: 2,
    rows: 2,
    now: 10,
  })
  const map = nested ? addObjectLayer(village, 'Portas') : village
  map.layers[0]!.cells![0] = 0
  if (nested) {
    const objects = map.layers.find(isObjectLayer)
    if (!objects) throw Error('Camada de portas ausente')
    objects.objects.push(createMapObject({ role: 'door', properties: { destino: cabin.id } }))
  }
  const assetsBefore = nested ? [sheet, map, detail, cabin] : [sheet, map]
  const before = await Promise.all(
    assetsBefore.map((asset, index) =>
      cloudAsset(asset, 1, index === 0 || asset.kind === 'tileset' ? '1' : null),
    ),
  )
  await local.causal.applyPull(
    {
      fromEpoch: null,
      epoch: '1',
      transitions: assetsBefore.map((after, i) => ({
        id: after.id,
        before: null,
        beforeRevision: null,
        after,
        remote: before[i]!.entry,
      })),
    },
    () => true,
  )
  const incoming = structuredClone(sheet)
  incoming.tiles[0]!.data[0] = 7
  const later = await cloudAsset(incoming, 2, '2')
  const { cloud, queued } = fakeCloud(map, 1)
  let offline = true
  const transport: PintaCausalCloud = {
    snapshot: async () => {
      if (offline) throw Error('sem rede')
      return {
        epoch: '2',
        requiredFormat: 6,
        entries: [later.entry, ...before.slice(1).map(({ entry }) => entry)],
      }
    },
    verifyEpoch: async (epoch) => {
      expect(epoch).toBe('2')
    },
    download: async ({ itemId }) =>
      itemId === sheet.id ? later.gzip : before.find(({ entry }) => entry.itemId === itemId)!.gzip,
    backfill: async () => {
      throw Error('backfill inesperado')
    },
    upload: async () => {
      if (offline) throw Error('sem rede')
      throw new PintaCausalRequestError(409, 'epoch-changed')
    },
    settle: async () => ({ state: 'aborted' }),
  }
  const inputPort =
    mode === 'fila-antiga'
      ? {
          ...local.causal,
          stage: (draft: Parameters<typeof local.causal.stage>[0]) =>
            local.causal.stage({ ...draft, pins: undefined }),
        }
      : local.causal
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: namespace,
    causal: { local: inputPort, holdOpen: async () => () => {}, withClosed: (_, apply) => apply() },
  })
  try {
    const author = await local.loadAssetById(map.id)
    const originalSheet = await local.loadAssetById(sheet.id)
    if (author?.kind !== 'tilemap' || originalSheet?.kind !== 'tileset')
      throw Error('Catálogo ausente')
    await wrapper.persistAsset(
      { ...author, name: 'minha-vila', updatedAt: 12 },
      {
        resources: observePintaReferences(author, await local.listAllAssets()),
      },
    )
    const work = {
      local: local.causal,
      cloud: transport,
      reader: 6,
      signal: new AbortController().signal,
    }
    await expect(flushPintaCausalOutbox(work)).rejects.toThrow('sem rede')
    const held = await local.causal.inFlight()
    if (!held) throw Error('Mapa retido ausente')
    expect(held.sealed.intent.members.map(({ itemId }) => itemId)).toEqual([map.id])
    const originalResource = await local.causal.pinned(held.sealed.intent.opId)
    if (mode === 'fila-antiga') {
      expect(originalResource).toBeNull()
      const disk = idbMockDb(`sistema-zero-pinta-${namespace}`)
      const record = disk.get('pinta:sync:causal')
      if (!record || typeof record !== 'object') throw Error('Fila ausente')
      disk.set('pinta:sync:causal', { ...record, version: 3 })
    } else
      expect(originalResource?.puts.map(({ itemId }) => itemId).sort()).toEqual(
        (nested ? [sheet.id, detail.id, cabin.id] : [sheet.id]).sort(),
      )
    const editedSheet = await legacy.loadAssetById(sheet.id)
    if (editedSheet?.kind !== 'tileset') throw Error('Folha ausente')
    editedSheet.tiles[0]!.data[0] = 5
    await legacy.persistAsset(editedSheet)
    offline = false
    let unsubscribe: (() => void) | undefined
    const finished = new Promise<void>((resolve) => {
      unsubscribe = wrapper.subscribe?.((event) => {
        if (event.type === 'sync-end') resolve()
      })
    })
    try {
      await wrapper.listAllAssets()
      await finished
    } finally {
      unsubscribe?.()
    }
    if (mode !== 'fila-antiga') {
      const assets = await local.listAllAssets()
      const authorCopies = assets.filter(
        (asset) => asset.kind === 'tilemap' && asset.name.startsWith('minha-vila-copia'),
      )
      expect(authorCopies).toHaveLength(2)
      const worldPixels = authorCopies.map((authorCopy) => {
        if (authorCopy.kind !== 'tilemap') throw Error('Vila recuperada ausente')
        const binding = authorCopy.layers.find(isObjectLayer)?.objects[0]?.properties.destino
        const connected = nested ? assets.find((asset) => asset.id === binding) : authorCopy
        if (connected?.kind !== 'tilemap') throw Error('Destino histórico ausente')
        if (nested) expect(connected.name.startsWith('cabana-copia')).toBe(true)
        const retainedSheet = assets.find((asset) => asset.id === connected.tilesetId)
        if (retainedSheet?.kind !== 'tileset') throw Error('Folha histórica ausente')
        return retainedSheet.tiles[0]?.data[0]
      })
      expect(worldPixels.sort()).toEqual([0, 5])
      const artistLeaf = assets
        .flatMap((asset) =>
          asset.kind === 'tileset' && asset.name.startsWith('pecas')
            ? [asset.tiles[0]?.data[0]]
            : [],
        )
        .sort()
      expect(artistLeaf).toEqual([0, 5, 7])
      expect(assets.find((asset) => asset.id === map.id)?.name).toBe('vila')
      expect((await local.causal.inspect()).epoch).toBe('2')
      expect(await local.causal.inFlight()).toBeNull()
      expect(await local.causal.pinned(held.sealed.intent.opId)).toBeNull()
      expect(queued).toEqual([])
      return
    }
    expect(wrapper.needsRetainedRecovery?.()).toBe(true)
    // Files come from this device and stay available with the account disconnected.
    offline = true
    const files = await wrapper.loadRetainedRecoveryFiles?.()
    const blob = files?.get(`${held.sealed.intent.opId}/${map.id}.pinta.json.gz`)
    const put = held.sealed.intent.members.find((member) => member.itemId === map.id)
    if (!blob || put?.action !== 'put') throw Error('Arquivo original não disponível')
    expect(await pintaCausalGzipHash(await blob.arrayBuffer())).toBe(put.sha256)
    const json = await new Response(
      blob.stream().pipeThrough(new DecompressionStream('gzip')),
    ).text()
    expect(local.causal.decodeCandidate(json)).toMatchObject({
      id: map.id,
      name: 'minha-vila',
      tilesetId: sheet.id,
    })
    expect((await local.causal.inspect()).epoch).toBe('1')
    expect((await local.causal.inFlight())?.sealed.intentHash).toBe(held.sealed.intentHash)
    const current = await local.loadAssetById(sheet.id)
    expect(current?.kind === 'tileset' && current.tiles[0]?.data[0]).toBe(5)
    const restarted = createCloudMirroredPintaPersistence({
      local,
      cloud: { ...cloud, pintaCausal: transport },
      viewerId: namespace,
      causal: {
        local: local.causal,
        holdOpen: async () => () => {},
        withClosed: (_, apply) => apply(),
      },
    })
    try {
      await restarted.listAllAssets()
      expect(restarted.needsRetainedRecovery?.()).toBe(true)
      const saved = await restarted.loadRetainedRecoveryFiles?.()
      const original = saved?.get(`${held.sealed.intent.opId}/${map.id}.pinta.json.gz`)
      if (!original) throw Error('Arquivo offline ausente')
      expect(await pintaCausalGzipHash(await original.arrayBuffer())).toBe(put.sha256)
    } finally {
      restarted.dispose?.()
    }
    expect(queued).toEqual([])
  } finally {
    wrapper.dispose?.()
  }
})

test('a mesma folha ocupa um só Blob e permanece até confirmar o último desenho que a lê', async () => {
  const namespace = 'pin-dedup-lifecycle'
  const local = createPintaCausalPersistence({ namespace })
  const sheet = createTilesetAsset({ name: 'folha', tileSize: 8 })
  const a = createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
  const b = createTilemapAsset({ name: 'cabana', tilesetId: sheet.id, cols: 2, rows: 2 })
  const documents = await Promise.all([
    cloudAsset(sheet, 1, '1'),
    cloudAsset(a, 1),
    cloudAsset(b, 1),
  ])
  await local.causal.applyPull(
    {
      fromEpoch: null,
      epoch: '1',
      transitions: [sheet, a, b].map((after, i) => ({
        id: after.id,
        before: null,
        beforeRevision: null,
        after,
        remote: documents[i]!.entry,
      })),
    },
    () => true,
  )
  const disk = idbMockDb(`sistema-zero-pinta-${namespace}`)
  const key = 'pinta:sync:observed-resources'
  const { cloud } = fakeCloud(a, 1)
  let sends = 0
  let online = false
  const transport: PintaCausalCloud = {
    snapshot: async () => {
      throw Error('sem rede')
    },
    verifyEpoch: async () => {
      throw Error('sem rede')
    },
    backfill: async () => {
      throw Error('sem rede')
    },
    download: async () => {
      throw Error('sem rede')
    },
    upload: async ({ intent, intentHash }) => {
      if (!online) throw Error('sem rede')
      const [put] = intent.members
      if (put?.action !== 'put' || intent.members.length !== 1) throw Error('PUT incorreto')
      expect(put.itemId).toBe(++sends === 1 ? a.id : b.id)
      const blobs = disk.get(key)
      if (!(blobs instanceof Map)) throw Error('Base observada ausente')
      expect(blobs.size).toBe(1)
      expect((await local.causal.inspect()).pins?.size).toBe(sends === 1 ? 2 : 1)
      return {
        opId: intent.opId,
        intentHash,
        epoch: String(BigInt(intent.baseEpoch) + 1n),
        members: [
          {
            itemId: put.itemId,
            revision: 2,
            sha256: put.sha256,
            layoutRevision: null,
            deleted: false,
          },
        ],
      }
    },
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: { ...cloud, pintaCausal: transport },
    viewerId: namespace,
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const original = await local.loadAssetById(sheet.id)
    const first = await local.loadAssetById(a.id)
    const second = await local.loadAssetById(b.id)
    if (!first || !second || !original) throw Error('Catálogo ausente')
    const ctx = {
      resources: [{ id: sheet.id, localRevision: pintaLocalRevisionOf(original) ?? null }],
    }
    const author = { ...first, name: 'minha-vila' }
    setIdbWriteGuard((putKey) => {
      if (putKey === key) throw Error('Anexo interrompido')
    })
    try {
      await expect(wrapper.persistAsset(author, ctx)).rejects.toThrow('Anexo interrompido')
    } finally {
      setIdbWriteGuard(null)
    }
    expect((await local.loadAssetById(a.id))?.name).toBe('vila')
    expect(disk.has(key)).toBe(false)
    expect((await local.causal.inspect()).pending).toEqual([])
    await wrapper.persistAsset(author, ctx)
    const work = {
      local: local.causal,
      cloud: transport,
      reader: 6,
      signal: new AbortController().signal,
    }
    await expect(flushPintaCausalOutbox(work)).rejects.toThrow('sem rede')
    await wrapper.persistAsset({ ...second, name: 'minha-cabana' }, ctx)
    const stored = disk.get(key)
    if (!(stored instanceof Map)) throw Error('Anexos ausentes')
    expect(stored.size).toBe(1)
    online = true
    await flushPintaCausalOutbox(work)
    expect(sends).toBe(2)
    expect(disk.has(key)).toBe(false)
    expect((await local.causal.inspect()).pins?.size).toBe(0)
  } finally {
    wrapper.dispose?.()
  }
})
