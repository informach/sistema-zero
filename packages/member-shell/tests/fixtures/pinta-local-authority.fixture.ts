import { beforeEach, expect, test } from 'bun:test'
import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import {
  type PintaCausalEntry,
  type PintaCausalIntent,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import { pintaLocalRevisionOf } from '../../../pinta/src/core/localAssetOrigin'
import type { PintaAsset } from '../../../pinta/src/core/project'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  withPintaSchemaStamp,
} from '../../../pinta/src/core/project'
import { assetFromJson, assetToJson } from '../../../pinta/src/export/assetJson'
import { clearIdbMock } from '../../../pinta/src/testing/idbMock'
import { remapTilesetConsumers } from '../../../pinta/src/tiles/tilesetConsumers'
import { addTile, removeTile } from '../../../pinta/src/tiles/tilesetOps'
import type {
  CloudCreationSummary,
  CreationsCloud,
  SnapshotProducer,
  UploadedListener,
} from '../../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../../src/lib/creations-sync'
import { PintaCausalRequestError, pintaCausalGzipHash } from '../../src/lib/pinta-causal-cloud'
import { flushPintaCausalOutbox } from '../../src/lib/pinta-causal-queue'
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
  const map = createTilemapAsset({ name: 'cabana', cols: 2, rows: 2, tilesetId: sheet.id })
  const layer = map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada ausente')
  layer.cells[0] = 1
  const a = await cloudAsset(sheet, 1, '1')
  const b = await cloudAsset(map, 4)
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
  cloud.pintaCausal = {
    snapshot: async () => ({ epoch: '1', requiredFormat: 6, entries: [a.entry, b.entry] }),
    verifyEpoch: async (epoch) => {
      expect(epoch).toBe('1')
    },
    download: async (entry) => {
      downloaded.push(entry.itemId)
      return (entry.itemId === sheet.id ? a : b).gzip
    },
    backfill: unused,
    upload: unused,
  }
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud,
    viewerId: 'remap',
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
  })
  try {
    const catalog = await wrapper.prepareTileRemap!(current)
    expect(downloaded).toEqual([map.id])
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
    expect(saved?.readSet).toEqual([{ source: 'unit', consumerId: map.id, targetId: sheet.id }])
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
  cloud.pintaCausal = {
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
    cloud,
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
