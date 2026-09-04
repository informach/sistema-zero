/**
 * O espelho do Molda: gravar local ENFILEIRA a subida (o JSON da criação, id preservado, a
 * miniatura só no modelo e só até o teto) e a marca só avança no commit; apagar grava lápide
 * e enfileira a remoção; a 1ª carga da galeria DESCE o que só existe na nuvem gravando direto
 * no local (id preservado, nome único); conflito real vira `-copia`; criação ABERTA no editor
 * é pulada e volta a descer ao fechar.
 */
import { describe, expect, test } from 'bun:test'
import type { MoldaAsset } from '@sistemazero/molda/assets'
import {
  assetFromJson,
  createModelAsset,
  createSkyAsset,
  createTextureAsset,
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
    async saveMany(assets) {
      for (const asset of assets) rows.set(asset.id, asset)
    },
    async remove(id) {
      rows.delete(id)
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
  const removed: Array<{ itemId: string; onRemoved?: RemovedListener }> = []
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
    enqueueRemove: (itemId, onRemoved) => {
      removed.push({ itemId, onRemoved })
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
      name: 'casa',
      kind: 'model',
      updatedAt: 1000,
      thumb,
      baseRevision: 0,
    })
    expect(assetFromCloudJson(snapshot?.json ?? '', casa.id)?.name).toBe('casa')
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

  test('apagar local grava LÁPIDE (não enviada) e enfileira a remoção; a confirmação marca a lápide como enviada; removeMany idem', async () => {
    const casa = model('casa', 1000)
    const ceu = createSkyAsset({ name: 'ceu', now: 1000 })
    const local = fakeLocal([casa, ceu])
    const { cloud, removed } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredMoldaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.remove(casa.id)
    expect(local.rows.has(casa.id)).toBe(false)
    expect(removed.map((r) => r.itemId)).toEqual([casa.id])
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: false, revision: null })
    removed[0]?.onRemoved?.({ revision: 1 })
    expect(marks.tombstone(casa.id)).toEqual({ at: 4242, sent: true, revision: 1 })
    await mirrored.removeMany([ceu.id])
    expect(local.rows.size).toBe(0)
    expect(removed.map((r) => r.itemId)).toEqual([casa.id, ceu.id])
    expect(marks.tombstone(ceu.id)?.sent).toBe(false)
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

    expect(lists.count).toBe(2)
    await secondPassEnded
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
