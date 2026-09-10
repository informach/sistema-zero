/**
 * O espelho do Molda: gravar local ENFILEIRA a subida (o JSON da criação, id preservado, a
 * miniatura só no modelo e só até o teto) e a marca só avança no commit; apagar grava lápide
 * e enfileira a remoção; a 1ª carga da galeria DESCE o que só existe na nuvem gravando direto
 * no local (id preservado, nome único); conflito real vira `-copia`; criação ABERTA no editor
 * é pulada e volta a descer ao fechar.
 */
import { describe, expect, spyOn, test } from 'bun:test'
import type { MoldaAsset, MoldaAssetSummary } from '@sistemazero/molda/assets'
import {
  assetFromJson,
  createModelAsset,
  createSkyAsset,
  createTextureAsset,
  MoldaUnsupportedVersionError,
  summarizeAsset,
} from '@sistemazero/molda/assets'
import type {
  CloudCreationSummary,
  CreationsCloud,
  RemovedListener,
  SnapshotProducer,
  StaleListener,
  UploadedListener,
} from '../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../src/lib/creations-sync'
import {
  assetFromCloudJson,
  assetToCloudJson,
  cloudThumbOf,
  copyName,
  createCloudMirroredMoldaPersistence,
  type MoldaPersistenceLike,
  uniqueAssetName,
} from '../src/lib/molda-cloud-persistence'

test('formato remoto desconhecido não vira um modelo legado incompleto', () => {
  const original = createModelAsset({ name: 'modelo', starter: false })
  const json = JSON.stringify({
    ...JSON.parse(assetToCloudJson(original)),
    formatVersion: 2,
    animations: [{ name: 'andar' }],
  })
  expect(() => assetFromCloudJson(json, original.id)).toThrow(MoldaUnsupportedVersionError)
})

test('summary listing reconciles without loading the gallery payload, including conflict copies', async () => {
  const mine = model('casa', 2000)
  if (mine.kind !== 'model') throw new Error('model fixture')
  const theirs = { ...mine, name: 'casa-remota', updatedAt: 3000 }
  const local = fakeLocal([mine])
  local.listSummaries = async () => [...local.rows.values()].map(summarizeAsset)
  const all = spyOn(local, 'loadAll')
  const marks = createMemorySyncedMarks()
  marks.set(mine.id, 1000, 1)
  const { cloud } = fakeCloud(
    new Map([
      [
        mine.id,
        {
          json: assetToCloudJson(theirs),
          summary: summaryOf(theirs, { revision: 2 }),
        },
      ],
    ]),
  )
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    cloud,
    viewerId: 'summary-profile',
    marks,
  })
  const done = new Promise<void>((resolve) => {
    mirrored.subscribe?.((event) => {
      if (event.type === 'sync-end') resolve()
    })
  })
  expect(await mirrored.listSummaries?.()).toEqual([summarizeAsset(mine)])
  await done
  expect(all).not.toHaveBeenCalled()
  expect(local.rows.get(mine.id)).toEqual(theirs)
  const copy = [...local.rows.values()].find((item) => item.id !== mine.id)
  expect(copy?.name).toBe('casa-copia')
  expect(copy?.kind === 'model' && copy.parts).toEqual(mine.parts)
  expect((await mirrored.listSummaries?.())?.length).toBe(2)
  expect(all).not.toHaveBeenCalled()
  mirrored.dispose?.()
  all.mockRestore()
})

test('an edit arriving while a conflict copy saves is not overwritten by the remote document', async () => {
  const mine = model('casa', 2000)
  const theirs = { ...mine, updatedAt: 3000 }
  const editedWhileCopying = { ...mine, updatedAt: 4000, name: 'edicao-durante-copia' }
  const local = fakeLocal([mine])
  const normalSave = local.saveMany.bind(local)
  local.saveMany = async (assets) => {
    await normalSave(assets)
    if (assets.some((asset) => asset.id !== mine.id)) local.rows.set(mine.id, editedWhileCopying)
  }
  const marks = createMemorySyncedMarks()
  marks.set(mine.id, 1000, 1)
  const { cloud } = fakeCloud(
    new Map([
      [
        mine.id,
        {
          json: assetToCloudJson(theirs),
          summary: summaryOf(theirs, { revision: 2 }),
        },
      ],
    ]),
  )
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    cloud,
    viewerId: 'copy-race',
    marks,
  })
  await loadSettled(mirrored, local)
  expect(local.rows.get(mine.id)).toEqual(editedWhileCopying)
  expect(local.rows.size).toBe(1)
  expect(marks.revision(mine.id)).toBe(1)
  mirrored.dispose?.()
})

test('remote deletion cannot erase an edit arriving while its conflict copy is saved', async () => {
  const mine = model('casa', 2000)
  const latest = { ...mine, name: 'edicao-nova', updatedAt: 4000 }
  const local = fakeLocal([mine])
  const save = local.saveMany
  local.saveMany = async (assets) => {
    await save(assets)
    local.rows.set(mine.id, latest)
  }
  const marks = createMemorySyncedMarks()
  marks.set(mine.id, 1000, 1)
  const { cloud } = fakeCloud(
    new Map([
      [
        mine.id,
        {
          json: '',
          summary: summaryOf(mine, { revision: 2, deletedAt: 3000 }),
        },
      ],
    ]),
  )
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    cloud,
    viewerId: 'delete-race',
    marks,
  })
  await loadSettled(mirrored, local)
  expect(local.rows.get(mine.id)).toEqual(latest)
  expect(local.rows.size).toBe(1)
  expect(marks.revision(mine.id)).toBe(1)
  expect(marks.tombstone(mine.id)).toBeUndefined()
  mirrored.dispose?.()
})

test('a conflict copy edited before rollback survives and its newest contents are queued', async () => {
  const mine = model('casa', 2000)
  const theirs = { ...mine, updatedAt: 3000 }
  const local = fakeLocal([mine])
  const save = local.saveMany
  let adopted: MoldaAsset | undefined
  local.saveMany = async (assets) => {
    await save(assets)
    const copy = assets.find((asset) => asset.id !== mine.id)
    if (!copy) return
    adopted = { ...copy, name: 'minha-copia-editada', updatedAt: copy.updatedAt + 1 }
    local.rows.set(copy.id, adopted)
    local.rows.set(mine.id, { ...mine, updatedAt: 4000 })
  }
  const marks = createMemorySyncedMarks()
  marks.set(mine.id, 1000, 1)
  const { cloud, uploads } = fakeCloud(
    new Map([
      [
        mine.id,
        {
          json: assetToCloudJson(theirs),
          summary: summaryOf(theirs, { revision: 2 }),
        },
      ],
    ]),
  )
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    cloud,
    viewerId: 'adopted-copy',
    marks,
  })
  await loadSettled(mirrored, local)
  if (!adopted) throw new Error('Expected a conflict copy')
  expect(local.rows.size).toBe(2)
  expect(local.rows.get(adopted.id)).toEqual(adopted)
  const upload = await uploads.get(adopted.id)?.produce()
  expect(assetFromCloudJson(upload?.json ?? '', adopted.id)).toEqual(adopted)
  expect(marks.revision(mine.id)).toBe(1)
  mirrored.dispose?.()
})

test('rejected conditional mutations do not enqueue uploads, deletions or advance marks', async () => {
  const mine = model('casa', 2000)
  const local = fakeLocal([mine])
  const marks = createMemorySyncedMarks()
  marks.set(mine.id, 2000, 3)
  const { cloud, uploads, removed } = fakeCloud(new Map())
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    cloud,
    viewerId: 'conditional',
    marks,
  })
  expect(await mirrored.saveIfUnchanged({ ...mine, updatedAt: 3000 }, 1000)).toBe(false)
  expect(await mirrored.removeIfUnchanged(mine.id, 1000)).toBe(false)
  expect(local.rows.get(mine.id)).toEqual(mine)
  expect(uploads.size).toBe(0)
  expect(removed).toHaveLength(0)
  expect(marks.revision(mine.id)).toBe(3)
  expect(marks.tombstone(mine.id)).toBeUndefined()
  mirrored.dispose?.()
})

function fakeLocal(initial: MoldaAsset[] = []): MoldaPersistenceLike & {
  rows: Map<string, MoldaAsset>
  emitLocal(event: { type: 'changed'; ids?: string[] }): void
} {
  const rows = new Map(initial.map((a) => [a.id, a]))
  const listeners = new Set<(event: { type: 'changed'; ids?: string[] }) => void>()
  return {
    rows,
    async loadAll() {
      return [...rows.values()]
    },
    async load(id) {
      return rows.get(id) ?? null
    },
    async save(asset) {
      rows.set(asset.id, asset)
    },
    async saveIfUnchanged(asset, expectedUpdatedAt) {
      if ((rows.get(asset.id)?.updatedAt ?? null) !== expectedUpdatedAt) return false
      rows.set(asset.id, asset)
      return true
    },
    async saveMany(assets) {
      for (const asset of assets) rows.set(asset.id, asset)
    },
    async remove(id) {
      rows.delete(id)
    },
    async removeIfUnchanged(id, expectedUpdatedAt) {
      if ((rows.get(id)?.updatedAt ?? null) !== expectedUpdatedAt) return false
      rows.delete(id)
      return true
    },
    async removeMany(ids) {
      for (const id of ids) rows.delete(id)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emitLocal(event) {
      for (const listener of listeners) listener(event)
    },
  }
}

function fakeCloud(remote: Map<string, { summary: CloudCreationSummary; json: string }>) {
  const uploads = new Map<
    string,
    { produce: SnapshotProducer; onUploaded?: UploadedListener; onStale?: StaleListener }
  >()
  const removed: Array<{
    itemId: string
    baseRevision: number
    onRemoved?: RemovedListener
    onStale?: StaleListener
  }> = []
  const lists = { count: 0 }
  const cloud: CreationsCloud = {
    tool: 'molda',
    supported: true,
    list: async () => {
      lists.count += 1
      return [...remote.values()].map((r) => r.summary)
    },
    upload: async () => ({ revision: 1 }),
    download: async (itemId) => {
      const r = remote.get(itemId)
      return r
        ? {
            json: r.json,
            summary: r.summary,
            parts: [],
            fetchPart: async () => {
              throw new Error('sem partes')
            },
          }
        : null
    },
    remove: async () => ({ revision: 1 }),
    enqueueUpload: (itemId, produce, onUploaded, onStale) => {
      uploads.set(itemId, { produce, onUploaded, onStale })
    },
    enqueueRemove: (itemId, baseRevision, onRemoved, onStale) => {
      removed.push({ itemId, baseRevision, onRemoved, onStale })
    },
    flush: async () => {},
    getState: () => ({ status: 'idle', pending: 0, lastSavedAt: null, lastError: null }),
    subscribe: () => () => {},
    dispose: () => {},
  }
  return { cloud, uploads, removed, lists }
}

const model = (name: string, updatedAt: number, thumb?: string): MoldaAsset => ({
  ...createModelAsset({ name, now: updatedAt }),
  ...(thumb ? { thumb } : {}),
})

const summaryOf = (
  asset: MoldaAsset,
  over: Partial<CloudCreationSummary> = {},
): CloudCreationSummary => ({
  itemId: asset.id,
  name: asset.name,
  kind: asset.kind,
  itemUpdatedAt: asset.updatedAt,
  revision: 1,
  bytes: 10,
  thumb: null,
  syncedAt: asset.updatedAt,
  ...over,
})

const remoteOf = (assets: MoldaAsset[]) =>
  new Map(assets.map((a) => [a.id, { json: assetToCloudJson(a), summary: summaryOf(a) }]))

test('sem a fonte da geração seguinte ligada, a criação remota nova vai para recuperação', async () => {
  const mine = model('robot', 1000)
  const raw = {
    ...JSON.parse(assetToCloudJson(mine)),
    formatVersion: 2,
    animations: [{ name: 'andar' }],
  }
  const remote = new Map([
    [
      mine.id,
      { json: JSON.stringify(raw), summary: summaryOf(mine, { revision: 2, formatVersion: 2 }) },
    ],
  ])
  const local = fakeLocal([mine])
  const { cloud, uploads } = fakeCloud(remote)
  const marks = createMemorySyncedMarks()
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    cloud,
    marks,
    viewerId: 'future-profile',
  })
  await loadSettled(mirrored, local)
  expect(mirrored.getReadIssues?.()).toEqual([
    { id: mine.id, name: mine.name, status: 'unsupported', version: 2 },
  ])
  expect(await mirrored.read?.(mine.id)).toEqual({ status: 'unsupported', version: 2, raw })
  expect(local.rows.get(mine.id)).toEqual(mine)
  expect(uploads.size).toBe(0)
  expect(marks.revision(mine.id)).toBeUndefined()
  mirrored.dispose?.()
})

/**
 * Abre a galeria (o wrapper devolve o LOCAL na hora e reconcilia em segundo plano) e espera
 * a reconciliação terminar (`sync-end`); devolve o local já reconciliado.
 */
async function loadSettled(
  mirrored: MoldaPersistenceLike,
  local: { loadAll(): Promise<MoldaAsset[]> },
): Promise<MoldaAsset[]> {
  const events: string[] = []
  const done = new Promise<void>((resolve) => {
    const unsubscribe = mirrored.subscribe?.((event) => {
      events.push(event.type)
      if (event.type === 'sync-end') {
        unsubscribe?.()
        resolve()
      }
    })
  })
  await mirrored.loadAll()
  await done
  expect(events[0]).toBe('sync-start')
  return local.loadAll()
}

describe('o JSON que viaja', () => {
  test('sobe com as peles em base64 e volta pelo sanitize com id e nome preservados; id trocado é recusado', () => {
    const casa = model('casa', 1000)
    const json = assetToCloudJson(casa)
    const back = assetFromCloudJson(json, casa.id)
    expect(back?.id).toBe(casa.id)
    expect(back?.name).toBe('casa')
    expect(back?.kind).toBe('model')
    expect(assetFromJson(JSON.parse(json))?.id).toBe(casa.id)
    expect(assetFromCloudJson(json, 'outro-id')).toBeNull()
    expect(assetFromCloudJson('{nem json', casa.id)).toBeNull()
    const sky = createSkyAsset({ name: 'ceu', now: 5 })
    expect(assetFromCloudJson(assetToCloudJson(sky), sky.id)?.kind).toBe('sky')
    const texture = createTextureAsset({ name: 'grama', size: 16, now: 5 })
    const textureJson = assetToCloudJson(texture)
    // A folha de pixels (Uint8Array) viaja em base64, nunca como objeto `{0: .., 1: ..}`.
    expect(textureJson.includes('"data":"')).toBe(true)
    expect(textureJson.includes('"0":')).toBe(false)
    expect(assetFromCloudJson(textureJson, texture.id)?.kind).toBe('texture')
  })

  test('a miniatura só viaja no modelo, como data URL de imagem e até 12 000 chars', () => {
    const small = `data:image/jpeg;base64,${'a'.repeat(100)}`
    expect(cloudThumbOf(model('casa', 1, small))).toBe(small)
    expect(
      cloudThumbOf(model('casa', 1, `data:image/jpeg;base64,${'a'.repeat(12_100)}`)),
    ).toBeNull()
    expect(cloudThumbOf(model('casa', 1, 'javascript:alert(1)'))).toBeNull()
    expect(cloudThumbOf(model('casa', 1))).toBeNull()
    expect(cloudThumbOf(createSkyAsset({ name: 'ceu', now: 1 }))).toBeNull()
  })

  test('nomes únicos e de cópia respeitam o teto de 48 do pacote', () => {
    const taken = new Set(['casa', 'casa-2'])
    expect(uniqueAssetName('casa', taken)).toBe('casa-3')
    expect(copyName('casa', taken)).toBe('casa-copia')
    const long = 'x'.repeat(60)
    expect(uniqueAssetName(long, new Set()).length).toBeLessThanOrEqual(48)
    expect(copyName(long, new Set([`${'x'.repeat(42)}-copia`])).length).toBeLessThanOrEqual(48)
  })
})

describe('createCloudMirroredMoldaPersistence', () => {
  test('gravar local enfileira a subida com o JSON da criação (id e nome preservados); a marca só avança no commit', async () => {
    const local = fakeLocal()
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    const thumb = `data:image/jpeg;base64,${'a'.repeat(64)}`
    const casa = model('casa', 1000, thumb)
    await mirrored.save(casa)
    expect(local.rows.has(casa.id)).toBe(true)
    const job = uploads.get(casa.id)
    expect(job).toBeDefined()
    const snapshot = await job?.produce()
    // `baseRevision: 0` = este aparelho nunca viu o item na nuvem (a reserva recusa se já houver).
    expect(snapshot?.meta).toEqual({
      formatVersion: 1,
      name: 'casa',
      kind: 'model',
      updatedAt: 1000,
      thumb,
      baseRevision: 0,
    })
    expect(assetFromCloudJson(snapshot?.json ?? '', casa.id)?.name).toBe('casa')
    expect(JSON.parse(snapshot?.json ?? '{}').formatVersion).toBe(snapshot?.meta?.formatVersion)
    // Enfileirar NÃO marca; o commit confirmado marca com o updatedAt E a revisão do que subiu.
    expect(marks.get(casa.id)).toBeUndefined()
    job?.onUploaded?.({ itemId: casa.id, updatedAt: 1000, revision: 3 })
    expect(marks.get(casa.id)).toBe(1000)
    expect(marks.revision(casa.id)).toBe(3)
    // Nada mudou desde a marca: o produtor devolve null (zero HTTP).
    await mirrored.saveMany([casa])
    expect(await uploads.get(casa.id)?.produce()).toBeNull()
    // Editou: sobe com a revisão conhecida como base.
    await mirrored.saveMany([{ ...casa, updatedAt: 1500 }])
    expect((await uploads.get(casa.id)?.produce())?.meta?.baseRevision).toBe(3)
    // O produtor lê o DISCO na hora: apagado antes de subir → nada sobe.
    await mirrored.remove(casa.id)
    expect(await job?.produce()).toBeNull()
  })

  test('apagar local grava LÁPIDE com a revisão conhecida e o DELETE leva essa base (nunca 0); a confirmação marca a lápide como enviada; removeMany idem', async () => {
    const casa = model('casa', 1000)
    const ceu = createSkyAsset({ name: 'ceu', now: 1000 })
    const local = fakeLocal([casa, ceu])
    const { cloud, removed } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 1000, 5)
    marks.set(ceu.id, 1000, 2)
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.remove(casa.id)
    expect(local.rows.has(casa.id)).toBe(false)
    // A marca some, mas a revisão foi para a lápide ANTES (o defeito de 06/09 mandava base 0).
    expect(marks.revision(casa.id)).toBeUndefined()
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([[casa.id, 5]])
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: false, revision: 5 })
    removed[0]?.onRemoved?.({ revision: 5 })
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: true, revision: 5 })
    await mirrored.removeMany([ceu.id])
    expect(local.rows.size).toBe(0)
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [casa.id, 5],
      [ceu.id, 2],
    ])
    expect(marks.tombstone(ceu.id)).toEqual({ at: 4242, sent: false, revision: 2 })
  })

  test('409 no DELETE: lápide sem revisão → reenvia UMA vez com a revisão corrente da nuvem; revisão MAIOR (editou em outro aparelho) → a criação volta e a lápide só sai depois de gravar', async () => {
    const casa = model('casa', 1000)
    const local = fakeLocal([casa])
    const { cloud, removed } = fakeCloud(
      new Map([
        [casa.id, { json: assetToCloudJson(casa), summary: summaryOf(casa, { revision: 5 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 1000)
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.remove(casa.id)
    await removed[0]?.onStale?.({ itemId: casa.id, currentRevision: 5 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [casa.id, 0],
      [casa.id, 5],
    ])
    expect(local.rows.has(casa.id)).toBe(false)
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: false, revision: 5 })

    const theirs: MoldaAsset = { ...casa, updatedAt: 2000 }
    const local2 = fakeLocal([casa])
    const { cloud: cloud2, removed: removed2 } = fakeCloud(
      new Map([
        [casa.id, { json: assetToCloudJson(theirs), summary: summaryOf(theirs, { revision: 7 }) }],
      ]),
    )
    const marks2 = createMemorySyncedMarks()
    marks2.set(casa.id, 1000, 5)
    const mirrored2 = createCloudMirroredMoldaPersistence({
      local: local2,
      cloud: cloud2,
      viewerId: 'perfil-1',
      marks: marks2,
      now: () => 4242,
    })
    await mirrored2.remove(casa.id)
    await removed2[0]?.onStale?.({ itemId: casa.id, currentRevision: 7 })
    expect(local2.rows.get(casa.id)?.updatedAt).toBe(2000)
    expect(marks2.revision(casa.id)).toBe(7)
    expect(marks2.tombstone(casa.id)).toBeUndefined()
    expect(removed2).toHaveLength(1)
  })

  test('uma lápide da nuvem apaga a criação local sem reenfileirar o mesmo id', async () => {
    const casa = model('casa', 1000)
    const local = fakeLocal([casa])
    const remote = new Map([
      [
        casa.id,
        {
          json: '',
          summary: summaryOf(casa, { revision: 2, deletedAt: 2000 }),
        },
      ],
    ])
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, casa.updatedAt, 1)
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })

    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(uploads.has(casa.id)).toBe(false)
    expect(marks.tombstone(casa.id)).toEqual({ at: 2000, sent: true, revision: 2 })
  })

  test('1ª carga: o que só existe na nuvem desce direto no local (id preservado, nome único); o que só existe aqui sobe', async () => {
    const remoteOnly = model('casa', 500)
    const homonym = model('casa', 700)
    const localOnly = createTextureAsset({ name: 'grama', size: 16, now: 900 })
    const local = fakeLocal([homonym, localOnly])
    const { cloud, uploads } = fakeCloud(remoteOf([remoteOnly]))
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })
    const events: string[] = []
    const done = new Promise<void>((resolve) => {
      mirrored.subscribe?.((event) => {
        events.push(event.type)
        if (event.type === 'sync-end') resolve()
      })
    })
    // O local volta na hora, sem esperar a nuvem; a descida avisa `sync-start` → `changed` → `sync-end`.
    const first = await mirrored.loadAll()
    expect(first.map((a) => a.id).sort()).toEqual([homonym.id, localOnly.id].sort())
    await done
    expect(events[0]).toBe('sync-start')
    expect(events).toContain('changed')
    expect(events.at(-1)).toBe('sync-end')
    const assets = await local.loadAll()
    const downloaded = assets.find((a) => a.id === remoteOnly.id)
    expect(downloaded?.name).toBe('casa-2')
    expect(assets.find((a) => a.id === homonym.id)?.name).toBe('casa')
    // O que desceu NÃO volta a subir; o local-only sim.
    expect(uploads.has(remoteOnly.id)).toBe(false)
    expect(uploads.has(localOnly.id)).toBe(true)
    expect(uploads.has(homonym.id)).toBe(true)
  })

  test('conflito real (os dois lados mudaram desde a marca) vira cópia `-copia` e a versão da nuvem entra no lugar', async () => {
    const mine = model('casa', 2000)
    const theirs: MoldaAsset = { ...mine, updatedAt: 3000, name: 'casa' }
    const local = fakeLocal([mine])
    const { cloud, uploads } = fakeCloud(
      new Map([
        [mine.id, { json: assetToCloudJson(theirs), summary: summaryOf(theirs, { revision: 2 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    // A última sincronia confirmada foi ANTES das duas edições.
    marks.set(mine.id, 1000, 1)
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 5000,
    })
    const assets = await loadSettled(mirrored, local)
    const names = assets.map((a) => a.name).sort()
    expect(names).toEqual(['casa', 'casa-copia'])
    expect(assets.find((a) => a.id === mine.id)?.updatedAt).toBe(3000)
    const copy = assets.find((a) => a.name === 'casa-copia')
    expect(copy?.id).not.toBe(mine.id)
    // A cópia (o lado daqui) sobe como criação nova.
    expect(uploads.has(copy?.id ?? '')).toBe(true)
    expect(marks.revision(mine.id)).toBe(2)
  })

  test('base vencida (`onStale`): a versão da nuvem vira cópia, a marca avança e o daqui sobe de novo; versão igual só avança a marca', async () => {
    const mine = model('casa', 2000)
    const theirs: MoldaAsset = { ...mine, updatedAt: 2500 }
    const local = fakeLocal([mine])
    const remote = new Map([
      [mine.id, { json: assetToCloudJson(theirs), summary: summaryOf(theirs, { revision: 4 }) }],
    ])
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 9000,
    })
    await mirrored.save(mine)
    await uploads.get(mine.id)?.onStale?.({ itemId: mine.id })
    const assets = await local.loadAll()
    expect(assets.map((a) => a.name).sort()).toEqual(['casa', 'casa-copia'])
    expect(marks.revision(mine.id)).toBe(4)
    expect((await uploads.get(mine.id)?.produce())?.meta?.baseRevision).toBe(4)

    // Mesmo `updatedAt` dos dois lados (outra aba deste perfil): sem cópia.
    const same = model('ceu', 100)
    const local2 = fakeLocal([same])
    const { cloud: cloud2, uploads: uploads2 } = fakeCloud(
      new Map([
        [same.id, { json: assetToCloudJson(same), summary: summaryOf(same, { revision: 7 }) }],
      ]),
    )
    const marks2 = createMemorySyncedMarks()
    const mirrored2 = createCloudMirroredMoldaPersistence({
      local: local2,
      cloud: cloud2,
      viewerId: 'perfil-1',
      marks: marks2,
    })
    await mirrored2.save(same)
    await uploads2.get(same.id)?.onStale?.({ itemId: same.id })
    expect((await local2.loadAll()).map((a) => a.name)).toEqual(['ceu'])
    expect(marks2.revision(same.id)).toBe(7)
  })

  test('criação ABERTA no editor é pulada na descida e volta a descer quando o registro avisa que fechou', async () => {
    const mine = model('casa', 2000)
    const theirs: MoldaAsset = { ...mine, updatedAt: 3000 }
    const local = fakeLocal([mine])
    const { cloud } = fakeCloud(
      new Map([
        [mine.id, { json: assetToCloudJson(theirs), summary: summaryOf(theirs, { revision: 2 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(mine.id, 2000, 1)
    const open = new Set([mine.id])
    const openListeners = new Set<() => void>()
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      isAssetOpen: (id) => open.has(id),
      subscribeAssetOpenState: (listener) => {
        openListeners.add(listener)
        return () => {
          openListeners.delete(listener)
        }
      },
    })
    const assets = await loadSettled(mirrored, local)
    // Aberta: nada gravado, marca parada.
    expect(assets.find((a) => a.id === mine.id)?.updatedAt).toBe(2000)
    expect(marks.revision(mine.id)).toBe(1)
    // Fechou: o registro avisa (sem id) e a reconciliação volta na hora, fora do intervalo mínimo.
    open.delete(mine.id)
    const settled = new Promise<void>((resolve) => {
      mirrored.subscribe?.((event) => {
        if (event.type === 'sync-end') resolve()
      })
    })
    for (const listener of openListeners) listener()
    await settled
    expect((await local.loadAll()).find((a) => a.id === mine.id)?.updatedAt).toBe(3000)
    expect(marks.revision(mine.id)).toBe(2)
    // `dispose` desliga o que escutava por fora.
    mirrored.dispose?.()
    expect(openListeners.size).toBe(0)
  })

  test('fechar durante uma reconciliação agenda outro passe depois do single-flight atual', async () => {
    const mine = model('casa', 2000)
    const theirs: MoldaAsset = { ...mine, updatedAt: 3000 }
    const blocker = model('arvore', 3000)
    const local = fakeLocal([mine])
    const { cloud, lists } = fakeCloud(remoteOf([theirs, blocker]))
    const marks = createMemorySyncedMarks()
    marks.set(mine.id, 2000, 1)
    const open = new Set([mine.id])
    const openListeners = new Set<() => void>()
    let releaseDownload: () => void = () => {}
    const downloadReleased = new Promise<void>((resolve) => {
      releaseDownload = resolve
    })
    const originalDownload = cloud.download
    cloud.download = async (itemId, signal) => {
      if (itemId === blocker.id) await downloadReleased
      return originalDownload(itemId, signal)
    }
    let resolveBusyChecked: () => void = () => {}
    const busyChecked = new Promise<void>((resolve) => {
      resolveBusyChecked = resolve
    })
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      isAssetOpen: (id) => {
        if (id === mine.id) resolveBusyChecked()
        return open.has(id)
      },
      subscribeAssetOpenState: (listener) => {
        openListeners.add(listener)
        return () => {
          openListeners.delete(listener)
        }
      },
    })
    let syncEnds = 0
    let resolveSecondPass: () => void = () => {}
    const secondPassEnded = new Promise<void>((resolve) => {
      resolveSecondPass = resolve
    })
    const firstPassEnded = new Promise<void>((resolve) => {
      mirrored.subscribe?.((event) => {
        if (event.type !== 'sync-end') return
        syncEnds += 1
        if (syncEnds === 1) resolve()
        if (syncEnds === 2) resolveSecondPass()
      })
    })

    await mirrored.loadAll()
    await busyChecked
    open.delete(mine.id)
    for (const listener of openListeners) listener()
    await Promise.resolve()
    releaseDownload()
    await firstPassEnded

    // O 2º passe começa no fim do 1º, mas só lê a lista DEPOIS do `flush` da fila (review 06/09):
    // a contagem de listagens é conferida quando ele termina.
    await secondPassEnded
    expect(lists.count).toBe(2)
    expect((await local.load(mine.id))?.updatedAt).toBe(3000)
    mirrored.dispose?.()
  })

  test('os avisos do próprio local (outra aba) atravessam o embrulho', async () => {
    const local = fakeLocal()
    const { cloud } = fakeCloud(new Map())
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })
    const seen: string[] = []
    const unsubscribe = mirrored.subscribe?.((event) => seen.push(event.type))
    local.emitLocal({ type: 'changed', ids: ['x'] })
    expect(seen).toEqual(['changed'])
    unsubscribe?.()
    local.emitLocal({ type: 'changed' })
    expect(seen).toEqual(['changed'])
  })

  test('dispose é idempotente e libera a persistência local', () => {
    const local = fakeLocal()
    let localDisposals = 0
    local.dispose = () => {
      localDisposals += 1
    }
    const { cloud } = fakeCloud(new Map())
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })

    mirrored.dispose?.()
    mirrored.dispose?.()

    expect(localDisposals).toBe(1)
  })

  test('uma reconciliação por carga: as releituras da galeria não abrem outra', async () => {
    const local = fakeLocal([model('casa', 1)])
    const { cloud, lists } = fakeCloud(new Map())
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
      now: () => 1_000_000,
    })
    await loadSettled(mirrored, local)
    await mirrored.loadAll()
    await mirrored.loadAll()
    expect(lists.count).toBe(1)
  })
})

describe('review 06/09: upload em voo × exclusão, flush antes da descida, criação aberta, 2º 409', () => {
  test('a lápide que nasce DEPOIS de o envio começar sobrevive à confirmação (revisão nova) e é promovida a ela; a descida não restaura e o DELETE reenvia com essa base', async () => {
    const casa = model('casa', 1000)
    const local = fakeLocal([casa])
    const { cloud, uploads, removed } = fakeCloud(
      new Map([
        [casa.id, { json: assetToCloudJson(casa), summary: summaryOf(casa, { revision: 4 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 900, 3)
    let clock = 100
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => clock,
    })
    await mirrored.save(casa)
    const job = uploads.get(casa.id)
    // O produtor lê o disco: o envio começa em 100, com a base 3.
    expect((await job?.produce())?.meta?.baseRevision).toBe(3)
    // A criança apaga com o upload em voo: a lápide nasce em 101, com a revisão 3.
    clock = 101
    await mirrored.remove(casa.id)
    expect(marks.tombstone(casa.id)).toEqual({ at: 101, sent: false, revision: 3 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([[casa.id, 3]])
    // O commit confirma a revisão 4: a lápide FICA (não enviada) e passa a conhecer a 4.
    job?.onUploaded?.({ itemId: casa.id, updatedAt: 1000, revision: 4 })
    expect(marks.tombstone(casa.id)).toEqual({ at: 101, sent: false, revision: 4 })
    // A descida vê a nuvem na 4 = a revisão da lápide: nada de "editado em outro aparelho";
    // reenvia a remoção com a base que a nuvem listou e NÃO restaura.
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [casa.id, 3],
      [casa.id, 4],
    ])
    expect(marks.tombstone(casa.id)).toEqual({ at: 101, sent: false, revision: 4 })
    // O DELETE original (base 3) leva 409 com a corrente 4: mesma história, reenvia com a 4.
    await removed[0]?.onStale?.({ itemId: casa.id, currentRevision: 4 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [casa.id, 3],
      [casa.id, 4],
      [casa.id, 4],
    ])
    expect(local.rows.has(casa.id)).toBe(false)
    removed[2]?.onRemoved?.({ revision: 4 })
    expect(marks.tombstone(casa.id)).toEqual({ at: 101, sent: true, revision: 4 })
  })

  test('caso normal: apagar e DEPOIS salvar de novo o mesmo id limpa a lápide na confirmação', async () => {
    const casa = model('casa', 1000)
    const local = fakeLocal([casa])
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 1000, 3)
    let clock = 100
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => clock,
    })
    await mirrored.remove(casa.id)
    expect(marks.tombstone(casa.id)).toEqual({ at: 100, sent: false, revision: 3 })
    // O id voltou (recriado) e sobe DEPOIS da exclusão: a confirmação limpa a lápide.
    clock = 101
    await mirrored.save({ ...casa, updatedAt: 2000 })
    const job = uploads.get(casa.id)
    expect((await job?.produce())?.meta?.updatedAt).toBe(2000)
    job?.onUploaded?.({ itemId: casa.id, updatedAt: 2000, revision: 4 })
    expect(marks.tombstone(casa.id)).toBeUndefined()
    expect(marks.revision(casa.id)).toBe(4)
  })

  test('a reconciliação dá `flush` na fila (com teto) ANTES de ler a lista: um DELETE em voo sobe primeiro; a fila falhando não bloqueia a descida', async () => {
    const casa = model('casa', 1000)
    const local = fakeLocal([casa])
    const { cloud, removed } = fakeCloud(remoteOf([casa]))
    const calls: string[] = []
    const flushOptions: Array<{ timeoutMs?: number } | undefined> = []
    cloud.flush = async (options) => {
      flushOptions.push(options)
      calls.push('flush')
      // A fila de verdade manda o que está pendente antes de devolver: aqui, o DELETE.
      for (const job of removed.splice(0)) {
        calls.push(`delete:${job.itemId}`)
        job.onRemoved?.({ revision: 1 })
      }
    }
    const originalList = cloud.list
    cloud.list = async (options) => {
      calls.push('list')
      return originalList(options)
    }
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 1000, 1)
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
      reconcileMinIntervalMs: 0,
    })
    await mirrored.remove(casa.id)
    expect(removed).toHaveLength(1)
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(calls).toEqual(['flush', `delete:${casa.id}`, 'list'])
    expect(flushOptions).toEqual([{ timeoutMs: 3000 }])
    // O DELETE já confirmado: a lista ainda mostra o item, mas a lápide enviada segura a descida.
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: true, revision: 1 })
    expect(removed).toHaveLength(0)
    // A fila fora do ar não segura a galeria: a lista continua sendo lida.
    cloud.flush = async () => {
      calls.push('flush-falhou')
      throw new Error('fila caiu')
    }
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(calls.slice(3)).toEqual(['flush-falhou', 'list'])
  })

  test('restauro do 409 com a criação ABERTA no editor: nada é gravado e a lápide sobrevive; fechada, o mesmo 409 restaura', async () => {
    const casa = model('casa', 1000)
    const theirs: MoldaAsset = { ...casa, updatedAt: 2000 }
    const local = fakeLocal([casa])
    const { cloud, removed } = fakeCloud(
      new Map([
        [casa.id, { json: assetToCloudJson(theirs), summary: summaryOf(theirs, { revision: 7 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 1000, 5)
    let open = true
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
      isAssetOpen: (id) => open && id === casa.id,
    })
    await mirrored.remove(casa.id)
    // Alguém editou depois (7 > 5), mas a criação está aberta: o restauro espera.
    await removed[0]?.onStale?.({ itemId: casa.id, currentRevision: 7 })
    expect(local.rows.has(casa.id)).toBe(false)
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: false, revision: 5 })
    expect(marks.revision(casa.id)).toBeUndefined()
    // Fechou: o mesmo 409 agora restaura, e a lápide só sai depois de gravar.
    open = false
    await removed[0]?.onStale?.({ itemId: casa.id, currentRevision: 7 })
    expect(local.rows.get(casa.id)?.updatedAt).toBe(2000)
    expect(marks.tombstone(casa.id)).toBeUndefined()
    expect(marks.revision(casa.id)).toBe(7)
  })

  test('2º 409 no DELETE (`retried`): a corrente cresceu de novo → a criação volta no mesmo id, a marca conhece a revisão da nuvem e a lápide só sai DEPOIS de gravar', async () => {
    const casa = model('casa', 1000)
    const theirs: MoldaAsset = { ...casa, updatedAt: 3000 }
    const local = fakeLocal([casa])
    const { cloud, removed } = fakeCloud(
      new Map([
        [casa.id, { json: assetToCloudJson(theirs), summary: summaryOf(theirs, { revision: 9 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 1000) // sem revisão: a lápide nasce sem revisão e o DELETE sai com base 0
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.remove(casa.id)
    // 1º 409: mesma história (lápide sem revisão), reenvia UMA vez com a 5.
    await removed[0]?.onStale?.({ itemId: casa.id, currentRevision: 5 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [casa.id, 0],
      [casa.id, 5],
    ])
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: false, revision: 5 })
    // A lápide ainda existe na hora de GRAVAR o restauro (só sai depois).
    const tombstoneAtWrite: unknown[] = []
    const saveIfUnchanged = local.saveIfUnchanged
    local.saveIfUnchanged = async (asset, expectedUpdatedAt) => {
      tombstoneAtWrite.push(marks.tombstone(casa.id))
      return saveIfUnchanged(asset, expectedUpdatedAt)
    }
    // 2º 409 (`retried`): a corrente é 9 > 5, alguém editou entre os dois envios → restaura.
    await removed[1]?.onStale?.({ itemId: casa.id, currentRevision: 9 })
    expect(local.rows.get(casa.id)?.updatedAt).toBe(3000)
    expect(marks.revision(casa.id)).toBe(9)
    expect(tombstoneAtWrite).toEqual([{ at: 4242, sent: false, revision: 5 }])
    expect(marks.tombstone(casa.id)).toBeUndefined()
    // Nenhum 3º DELETE: o reenvio é UMA vez só.
    expect(removed).toHaveLength(2)
  })

  test('2º 409 sem `currentRevision` com a nuvem já sem a criação: a lápide vira enviada, nada restaura', async () => {
    const casa = model('casa', 1000)
    const local = fakeLocal([casa])
    const { cloud, removed } = fakeCloud(new Map()) // download → null
    const marks = createMemorySyncedMarks()
    marks.set(casa.id, 1000)
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.remove(casa.id)
    await removed[0]?.onStale?.({ itemId: casa.id, currentRevision: 5 })
    await removed[1]?.onStale?.({ itemId: casa.id })
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: true, revision: 5 })
    expect(local.rows.has(casa.id)).toBe(false)
    expect(removed).toHaveLength(2)
  })

  test('lápide legada `{revision: null}` (dado já em produção): a descida reenvia o DELETE com a revisão da NUVEM e nada é restaurado', async () => {
    const casa = model('casa', 1000)
    const local = fakeLocal()
    const { cloud, removed } = fakeCloud(
      new Map([
        [casa.id, { json: assetToCloudJson(casa), summary: summaryOf(casa, { revision: 3 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.setTombstone(casa.id, { at: 500, sent: false, revision: null })
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([[casa.id, 3]])
    expect(marks.tombstone(casa.id)).toEqual({ at: 500, sent: false, revision: null })
    removed[0]?.onRemoved?.({ revision: 3 })
    expect(marks.tombstone(casa.id)).toEqual({ at: 500, sent: true, revision: 3 })
  })
})

/**
 * A fonte da geração seguinte, no molde da real: guarda o JSON e o resumo, compara o
 * carimbo autoral antes de gravar e devolve resumo marcado com `formatVersion: 2`.
 */
function fakeScene(initial: MoldaAsset[] = []) {
  const rows = new Map<string, { summary: MoldaAssetSummary; json: string }>()
  const put = (asset: MoldaAsset) => {
    const json = JSON.stringify({ ...JSON.parse(assetToCloudJson(asset)), formatVersion: 2 })
    rows.set(asset.id, { summary: { ...summarizeAsset(asset), formatVersion: 2 }, json })
  }
  for (const asset of initial) put(asset)
  const readJson = (json: string): MoldaAssetSummary | null => {
    try {
      const raw = JSON.parse(json) as { formatVersion?: number; id?: string; name?: string }
      if (raw.formatVersion !== 2 || typeof raw.id !== 'string' || typeof raw.name !== 'string')
        return null
      return { ...summarizeAsset(assetFromJson({ ...raw, formatVersion: 1 })!), formatVersion: 2 }
    } catch {
      return null
    }
  }
  return {
    rows,
    listSummaries: async () => [...rows.values()].map((row) => row.summary),
    read: async (id: string) => rows.get(id) ?? null,
    inspect: (json: string) => readJson(json),
    saveIfUnchanged: async (
      id: string,
      json: string,
      expectedUpdatedAt: number | null,
      name?: string,
    ) => {
      const current = rows.get(id)
      if ((current?.summary.updatedAt ?? null) !== expectedUpdatedAt) return false
      const summary = readJson(json)
      if (!summary || summary.id !== id) return false
      rows.set(id, {
        summary: name === undefined ? summary : { ...summary, name },
        json: name === undefined ? json : JSON.stringify({ ...JSON.parse(json), name }),
      })
      return true
    },
    saveCopy: async (json: string, name: string, clock?: () => number) => {
      const summary = readJson(json)
      if (!summary) return null
      const id = crypto.randomUUID()
      const updatedAt = (clock ?? Date.now)()
      const copy = { ...summary, id, name, updatedAt }
      rows.set(id, { summary: copy, json: JSON.stringify({ ...JSON.parse(json), id, name }) })
      return copy
    },
    removeIfUnchanged: async (id: string, expectedUpdatedAt: number | null) => {
      const current = rows.get(id)
      if (!current || current.summary.updatedAt !== expectedUpdatedAt) return false
      rows.delete(id)
      return true
    },
    subscribe: () => () => {},
  }
}

test('a criação promovida continua na lista e a nuvem NÃO recebe exclusão por causa disso', async () => {
  const promoted = model('nave', 2000)
  // Promovida: saiu do inventário v1 e entrou no da geração seguinte.
  const local = fakeLocal([])
  const scene = fakeScene([promoted])
  const { cloud, removed } = fakeCloud(remoteOf([promoted]))
  const marks = createMemorySyncedMarks()
  marks.set(promoted.id, promoted.updatedAt, 1)
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    sceneSource: scene,
    cloud,
    marks,
    viewerId: 'promoted-profile',
  })
  await loadSettled(mirrored, local)
  expect(removed).toEqual([])
  expect(scene.rows.has(promoted.id)).toBe(true)
  expect(local.rows.size).toBe(0)
  mirrored.dispose?.()
})

test('a criação da geração seguinte sobe com o formato e a miniatura dela', async () => {
  const promoted = model('nave', 5000)
  const local = fakeLocal([])
  const scene = fakeScene([promoted])
  const { cloud, uploads } = fakeCloud(new Map())
  const marks = createMemorySyncedMarks()
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    sceneSource: scene,
    cloud,
    marks,
    viewerId: 'upload-profile',
  })
  await loadSettled(mirrored, local)
  const upload = uploads.get(promoted.id)
  expect(upload !== undefined).toBe(true)
  const snapshot = await upload?.produce()
  if (!snapshot?.meta) throw new Error('a criação da geração seguinte não foi enfileirada')
  expect(snapshot.meta.formatVersion).toBe(2)
  expect(snapshot.meta.name).toBe('nave')
  expect(snapshot.meta.updatedAt).toBe(5000)
  expect(JSON.parse(snapshot.json).formatVersion).toBe(2)
  mirrored.dispose?.()
})

test('a criação da geração seguinte desce para o inventário dela, não para o v1', async () => {
  const remote = model('nave', 7000)
  const json = JSON.stringify({ ...JSON.parse(assetToCloudJson(remote)), formatVersion: 2 })
  const local = fakeLocal([])
  const scene = fakeScene([])
  const { cloud } = fakeCloud(
    new Map([[remote.id, { json, summary: summaryOf(remote, { formatVersion: 2 }) }]]),
  )
  const mirrored = createCloudMirroredMoldaPersistence({
    local,
    sceneSource: scene,
    cloud,
    marks: createMemorySyncedMarks(),
    viewerId: 'download-profile',
  })
  await loadSettled(mirrored, local)
  expect(mirrored.getReadIssues?.()).toEqual([])
  expect(scene.rows.get(remote.id)?.summary.name).toBe('nave')
  expect(local.rows.size).toBe(0)
  mirrored.dispose?.()
})
