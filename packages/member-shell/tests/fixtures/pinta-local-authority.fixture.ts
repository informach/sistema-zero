import { beforeEach, expect, test } from 'bun:test'
import { pintaLocalRevisionOf } from '../../../pinta/src/core/localAssetOrigin'
import {
  createTilemapAsset,
  isTileLayer,
  withPintaSchemaStamp,
} from '../../../pinta/src/core/project'
import { assetFromJson, assetToJson } from '../../../pinta/src/export/assetJson'
import { clearIdbMock } from '../../../pinta/src/testing/idbMock'
import type {
  CloudCreationSummary,
  CreationsCloud,
  SnapshotProducer,
  UploadedListener,
} from '../../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../../src/lib/creations-sync'
import {
  createCloudMirroredPintaPersistence,
  createMemoryPintaFormatMemory,
} from '../../src/lib/pinta-cloud-persistence'

const { createPintaPersistence, PintaLocalConflictError } = await import(
  '../../../pinta/src/state/persistence'
)
beforeEach(clearIdbMock)

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

test('o gravador B sobe a autoridade nativa 7 inteira com nuvem 6 e só confirma após o commit', async () => {
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
