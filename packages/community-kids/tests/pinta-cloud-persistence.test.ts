/**
 * O espelho do Pinta: gravar local ENFILEIRA a subida (o `.pinta.json` do desenho, id
 * preservado) e a marca só avança no commit; apagar grava lápide e enfileira a remoção;
 * a 1ª carga da galeria DESCE o que só existe na nuvem gravando direto no local (id
 * preservado, sem passar pelo embrulho), com nome único e sem reintroduzir teto de quantidade;
 * conflito real vira `-copia` DEPOIS de a descida ter sido baixada e validada.
 */
import { describe, expect, test } from 'bun:test'
import type { PaletteLibrary, PintaAsset } from '@sistemazero/pinta/assets'
import { assetFromJson, assetToJson, createAsset, PINTA_LIMITS } from '@sistemazero/pinta/assets'
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
  createCloudMirroredPintaPersistence,
  PALETTE_LIBRARY_ITEM_ID,
  PALETTE_LIBRARY_KIND,
  type PintaPersistenceLike,
  uniqueAssetName,
} from '../src/lib/pinta-cloud-persistence'

function fakeLocal(initial: PintaAsset[] = []): PintaPersistenceLike & {
  rows: Map<string, PintaAsset>
  library: { current: PaletteLibrary | null }
} {
  const rows = new Map(initial.map((a) => [a.id, a]))
  const library: { current: PaletteLibrary | null } = { current: null }
  return {
    rows,
    library,
    async persistAsset(asset) {
      rows.set(asset.id, asset)
    },
    async persistAssets(assets) {
      for (const asset of assets) rows.set(asset.id, asset)
    },
    async deleteAsset(id) {
      rows.delete(id)
    },
    async loadAssetById(id) {
      return rows.get(id) ?? null
    },
    async listAllAssets() {
      return [...rows.values()]
    },
    async loadPaletteLibrary() {
      return library.current
    },
    async savePaletteLibrary(next) {
      library.current = next
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
    tool: 'pinta',
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

const sprite = (name: string, updatedAt: number): PintaAsset => ({
  ...createAsset({ kind: 'pixel-sprite', name, frameSize: 8 }),
  updatedAt,
})

const summaryOf = (
  asset: PintaAsset,
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

const remoteOf = (assets: PintaAsset[]) =>
  new Map(assets.map((a) => [a.id, { json: assetToJson(a), summary: summaryOf(a) }]))

/**
 * Abre a galeria (o wrapper devolve o LOCAL na hora e reconcilia em segundo plano) e espera
 * a reconciliação terminar (`sync-end`); devolve o local já reconciliado.
 */
async function loadSettled(
  mirrored: PintaPersistenceLike,
  local: { listAllAssets(): Promise<PintaAsset[]> },
): Promise<PintaAsset[]> {
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
  await mirrored.listAllAssets()
  await done
  expect(events[0]).toBe('sync-start')
  return local.listAllAssets()
}

describe('createCloudMirroredPintaPersistence', () => {
  test('gravar local enfileira a subida com o .pinta.json do desenho (id e nome preservados); a marca só avança no commit', async () => {
    const local = fakeLocal()
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    const nave = sprite('nave', 1000)
    await mirrored.persistAssets([nave])
    expect(local.rows.has(nave.id)).toBe(true)
    const job = uploads.get(nave.id)
    expect(job).toBeDefined()
    const snapshot = await job?.produce()
    // `baseRevision: 0` = este aparelho nunca viu o item na nuvem (a reserva recusa se já houver).
    expect(snapshot?.meta).toEqual({
      name: 'nave',
      kind: 'pixel-sprite',
      updatedAt: 1000,
      baseRevision: 0,
    })
    const back = assetFromJson(snapshot?.json ?? '')
    expect(back.asset?.id).toBe(nave.id)
    expect(back.asset?.name).toBe('nave')
    // Enfileirar NÃO marca; o commit confirmado marca com o updatedAt E a revisão do que subiu.
    expect(marks.get(nave.id)).toBeUndefined()
    job?.onUploaded?.({ itemId: nave.id, updatedAt: 1000, revision: 3 })
    expect(marks.get(nave.id)).toBe(1000)
    expect(marks.revision(nave.id)).toBe(3)
    // A próxima subida leva a revisão conhecida como base.
    await mirrored.persistAssets([{ ...nave, updatedAt: 1500 }])
    expect((await uploads.get(nave.id)?.produce())?.meta?.baseRevision).toBe(3)
    // O produtor lê o DISCO na hora: apagado antes de subir → nada sobe.
    await mirrored.deleteAsset(nave.id)
    expect(await job?.produce()).toBeNull()
  })

  test('nada mudou desde a última sincronia (marca = updatedAt): o produtor devolve null e nada sobe', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000, 2)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    // O editor persiste [salvo, ...ligados]: um asset intocado não pode subir de novo.
    await mirrored.persistAssets([nave])
    expect(await uploads.get(nave.id)?.produce()).toBeNull()
    // Editou: sobe.
    await mirrored.persistAssets([{ ...nave, updatedAt: 1500 }])
    expect(await uploads.get(nave.id)?.produce()).not.toBeNull()
  })

  test('o que não coube no orçamento (`deferred`) volta em passes seguidos, sem esperar o próximo F5', async () => {
    const remoteOnly = sprite('so-nuvem', 500)
    const local = fakeLocal()
    const { cloud } = fakeCloud(remoteOf([remoteOnly]))
    let listCalls = 0
    const originalList = cloud.list
    cloud.list = async (opts) => {
      listCalls += 1
      return originalList(opts)
    }
    // Relógio que "estoura" o orçamento nos 2 primeiros passes e libera no 3º.
    let tick = 0
    const now = () => {
      tick += 1
      // Passe 1 e 2: cada `now()` pula 10 s → tudo adiado. Depois: tempo parado → cabe.
      return tick < 6 ? tick * 10_000 : 100_000
    }
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
      now,
      budgetMs: 5_000,
      passDelayMs: 1,
    })
    const assets = await loadSettled(mirrored, local)
    expect(assets.map((a) => a.name)).toEqual(['so-nuvem'])
    expect(listCalls).toBeGreaterThanOrEqual(2)
  })

  test('apagar local grava LÁPIDE (não enviada) e enfileira a remoção; a confirmação marca a lápide como enviada', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.deleteAsset(nave.id)
    expect(local.rows.has(nave.id)).toBe(false)
    expect(removed.map((r) => r.itemId)).toEqual([nave.id])
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: false, revision: null })
    removed[0]?.onRemoved?.({ revision: 1 })
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: true, revision: 1 })
  })

  test('base vencida (outro aparelho subiu antes): a versão da nuvem entra como CÓPIA, a marca avança e o desenho daqui sobe de novo', async () => {
    const mine = sprite('nave', 1000)
    const theirs: PintaAsset = { ...mine, updatedAt: 2000 }
    const local = fakeLocal([mine])
    const remote = new Map([
      [mine.id, { json: assetToJson(theirs), summary: summaryOf(theirs, { revision: 7 }) }],
    ])
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 9000,
    })
    await mirrored.persistAssets([mine])
    const job = uploads.get(mine.id)
    expect(job?.onStale).toBeDefined()
    await job?.onStale?.({ itemId: mine.id })
    // A versão da nuvem virou um desenho novo (id novo, nome "-copia") e foi enfileirada.
    const all = await local.listAllAssets()
    const copy = all.find((a) => a.id !== mine.id)
    expect(copy?.name).toBe('nave-copia')
    expect(copy?.updatedAt).toBe(9000)
    expect(uploads.has(copy?.id ?? '')).toBe(true)
    // O desenho daqui continua com o id dele, e a marca conhece a revisão da nuvem (7):
    // a próxima reserva leva base 7 e passa.
    expect(local.rows.get(mine.id)?.updatedAt).toBe(1000)
    expect(marks.revision(mine.id)).toBe(7)
    expect((await uploads.get(mine.id)?.produce())?.meta?.baseRevision).toBe(7)
  })

  test('a 1ª carga DESCE o que só existe na nuvem (id preservado) e SOBE o que só existe aqui', async () => {
    const soLocal = sprite('so-local', 500)
    const soNuvem = sprite('so-nuvem', 700)
    const local = fakeLocal([soLocal])
    const { cloud, uploads } = fakeCloud(remoteOf([soNuvem]))
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    const listed = await loadSettled(mirrored, local)
    expect(listed.map((a) => a.name).sort()).toEqual(['so-local', 'so-nuvem'])
    expect(local.rows.get(soNuvem.id)?.name).toBe('so-nuvem')
    // O que desceu NÃO volta a subir (e ganha marca); o que só existe aqui sobe.
    expect(uploads.has(soNuvem.id)).toBe(false)
    expect(marks.get(soNuvem.id)).toBe(700)
    expect(uploads.has(soLocal.id)).toBe(true)
  })

  test('apagado aqui e ainda na nuvem: NÃO volta na próxima carga (lápide)', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud } = fakeCloud(remoteOf([nave]))
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 5000,
    })
    await mirrored.deleteAsset(nave.id)
    // A nuvem ainda tem o item (o DELETE "não chegou"): a galeria abre sem ele.
    const listed = await loadSettled(mirrored, local)
    expect(listed).toEqual([])
    expect(local.rows.has(nave.id)).toBe(false)
  })

  test('nuvem mais nova com o local também mudado: o local vira `-copia` (id novo) e a nuvem entra', async () => {
    const localNave = sprite('nave', 120)
    const cloudNave: PintaAsset = { ...localNave, updatedAt: 200, name: 'nave' }
    const remote = new Map([
      [
        localNave.id,
        { json: assetToJson(cloudNave), summary: summaryOf(cloudNave, { revision: 3 }) },
      ],
    ])
    const marks = createMemorySyncedMarks()
    marks.set(localNave.id, 80) // a última sincronia foi ANTES da edição local (120)
    const local = fakeLocal([localNave])
    const { cloud, uploads } = fakeCloud(remote)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 999,
    })
    const listed = await loadSettled(mirrored, local)
    const names = listed.map((a) => a.name).sort()
    expect(names).toEqual(['nave', 'nave-copia'])
    const copy = listed.find((a) => a.name === 'nave-copia')
    expect(copy?.id).not.toBe(localNave.id)
    expect(local.rows.get(localNave.id)?.updatedAt).toBe(200)
    // A cópia é deste aparelho: sobe.
    expect(copy && uploads.has(copy.id)).toBe(true)
  })

  test('a galeria RELÊ no `sync-end`/`changed` (chama `listAllAssets()` de novo): isso NÃO abre outra reconciliação — uma por carga, nunca em laço', async () => {
    const cloudNave = sprite('nave', 200)
    const local = fakeLocal()
    const { cloud, lists } = fakeCloud(remoteOf([cloudNave]))
    let clock = 1000
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
      now: () => clock,
      passDelayMs: 1,
    })
    let starts = 0
    let ends = 0
    // O que o `galleryStore` do pacote faz: a cada `changed`/`sync-end`, relê a lista.
    mirrored.subscribe?.((event) => {
      if (event.type === 'sync-start') starts += 1
      if (event.type === 'changed' || event.type === 'sync-end') {
        if (event.type === 'sync-end') ends += 1
        void mirrored.listAllAssets()
      }
    })
    await mirrored.listAllAssets()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(starts).toBe(1)
    expect(ends).toBe(1)
    expect(lists.count).toBe(1)
    expect(local.rows.has(cloudNave.id)).toBe(true)
    // Bem mais tarde (passado o intervalo mínimo), uma nova carga reconcilia de novo.
    clock += 120_000
    await mirrored.listAllAssets()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(starts).toBe(2)
    expect(lists.count).toBe(2)
  })

  test('desenho ABERTO no editor não é gravado por baixo (nem copiado): fica para a próxima reconciliação; a marca não avança', async () => {
    const localNave = sprite('nave', 120)
    const cloudNave: PintaAsset = { ...localNave, updatedAt: 200 }
    const marks = createMemorySyncedMarks()
    marks.set(localNave.id, 120, 1) // local intocado: a nuvem é mais nova → desceria
    const local = fakeLocal([localNave])
    const { cloud } = fakeCloud(remoteOf([cloudNave]))
    let open = true
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      isAssetOpen: (id) => open && id === localNave.id,
      passDelayMs: 1,
      reconcileMinIntervalMs: 0,
    })
    await loadSettled(mirrored, local)
    expect(local.rows.get(localNave.id)?.updatedAt).toBe(120)
    expect(marks.get(localNave.id)).toBe(120)
    expect(local.rows.size).toBe(1)
    // Fechou o editor: a próxima reconciliação traz a versão da nuvem.
    open = false
    await loadSettled(mirrored, local)
    expect(local.rows.get(localNave.id)?.updatedAt).toBe(200)
    expect(marks.get(localNave.id)).toBe(200)
  })

  test('desenho pulado por estar aberto: ao FECHAR o editor (evento do pacote) a versão da nuvem entra na hora, sem esperar a próxima carga', async () => {
    const localNave = sprite('nave', 120)
    const cloudNave: PintaAsset = { ...localNave, updatedAt: 200 }
    const marks = createMemorySyncedMarks()
    marks.set(localNave.id, 120, 1)
    const local = fakeLocal([localNave])
    const { cloud, lists } = fakeCloud(remoteOf([cloudNave]))
    let open = true
    const openListeners = new Set<(event: { type: 'opened' | 'closed'; id: string }) => void>()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      isAssetOpen: (id) => open && id === localNave.id,
      subscribeAssetOpenState: (listener) => {
        openListeners.add(listener)
        return () => openListeners.delete(listener)
      },
      passDelayMs: 1,
    })
    const events: string[] = []
    mirrored.subscribe?.((event) => events.push(event.type))
    await loadSettled(mirrored, local)
    expect(local.rows.get(localNave.id)?.updatedAt).toBe(120)
    expect(lists.count).toBe(1)
    // Fechar OUTRO desenho não faz nada; fechar o pulado dispara a reconciliação (mesmo dentro
    // do intervalo mínimo entre cargas).
    for (const l of openListeners) l({ type: 'closed', id: 'outro' })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(lists.count).toBe(1)
    open = false
    for (const l of openListeners) l({ type: 'closed', id: localNave.id })
    await new Promise<void>((resolve) => {
      const unsubscribe = mirrored.subscribe?.((event) => {
        if (event.type === 'sync-end') {
          unsubscribe?.()
          resolve()
        }
      })
    })
    expect(lists.count).toBe(2)
    expect(local.rows.get(localNave.id)?.updatedAt).toBe(200)
    expect(marks.get(localNave.id)).toBe(200)
    // `dispose` desliga a escuta.
    mirrored.dispose?.()
    expect(openListeners.size).toBe(0)
  })

  test('edição persistida DEPOIS do retrato da reconciliação (antes de gravar) não é sobrescrita pela descida', async () => {
    const localNave = sprite('nave', 120)
    const cloudNave: PintaAsset = { ...localNave, updatedAt: 200 }
    const marks = createMemorySyncedMarks()
    marks.set(localNave.id, 120, 1)
    const local = fakeLocal([localNave])
    const { cloud } = fakeCloud(remoteOf([cloudNave]))
    // A descida demora; no meio, o autosave grava uma edição nova (150).
    const slowDownload = cloud.download
    cloud.download = async (id, opts) => {
      await local.persistAssets([{ ...localNave, updatedAt: 150 }])
      return slowDownload(id, opts)
    }
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      passDelayMs: 1,
    })
    await loadSettled(mirrored, local)
    // A edição (150) continua no disco; a nuvem (200) NÃO passou por cima; a marca ficou.
    expect(local.rows.get(localNave.id)?.updatedAt).toBe(150)
    expect(marks.get(localNave.id)).toBe(120)
  })

  test('base vencida com a versão da nuvem IGUAL à daqui (outra aba deste perfil subiu antes): só avança a marca, sem `-copia`', async () => {
    const nave = sprite('nave', 500)
    const local = fakeLocal([nave])
    const { cloud, uploads } = fakeCloud(
      new Map([[nave.id, { json: assetToJson(nave), summary: summaryOf(nave, { revision: 4 }) }]]),
    )
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    await mirrored.persistAsset(nave)
    await uploads.get(nave.id)?.onStale?.({ itemId: nave.id })
    expect(local.rows.size).toBe(1)
    expect(marks.revision(nave.id)).toBe(4)
    expect(marks.get(nave.id)).toBe(500)
  })

  test('descida corrompida (sanitize recusa) NÃO cria cópia nem toca no local', async () => {
    const localNave = sprite('nave', 120)
    const remote = new Map([
      [
        localNave.id,
        {
          json: '{"asset": {"kind": "pixel-sprite"}}',
          summary: summaryOf(localNave, { itemUpdatedAt: 200 }),
        },
      ],
    ])
    const marks = createMemorySyncedMarks()
    marks.set(localNave.id, 80)
    const local = fakeLocal([localNave])
    const { cloud } = fakeCloud(remote)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    const listed = await loadSettled(mirrored, local)
    expect(listed.map((a) => a.name)).toEqual(['nave'])
    expect(local.rows.get(localNave.id)?.updatedAt).toBe(120)
  })

  test('nome já usado por OUTRO desenho local ganha sufixo ao descer (não há teto de quantidade)', async () => {
    const localNave = sprite('nave', 100)
    const cloudNave = sprite('nave', 100) // id diferente, mesmo nome
    const local = fakeLocal([localNave])
    const { cloud } = fakeCloud(remoteOf([cloudNave]))
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })
    const listed = await loadSettled(mirrored, local)
    expect(listed.map((a) => a.name).sort()).toEqual(['nave', 'nave-2'])
    expect(local.rows.get(cloudNave.id)?.name).toBe('nave-2')

    // Sem teto: 120 desenhos da nuvem descem numa galeria com 100 (com orçamento de tempo folgado).
    const many = Array.from({ length: 100 }, (_, i) => sprite(`d-${i}`, 1))
    const local2 = fakeLocal(many)
    const extra = Array.from({ length: 120 }, (_, i) => sprite(`n-${i}`, 1))
    const { cloud: cloud2 } = fakeCloud(remoteOf(extra))
    const mirrored2 = createCloudMirroredPintaPersistence({
      local: local2,
      cloud: cloud2,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })
    expect((await loadSettled(mirrored2, local2)).length).toBe(220)
  })

  test('descidas paralelas reservam sufixos diferentes antes de persistir', async () => {
    const localNave = sprite('nave', 100)
    const cloudA = { ...sprite('nave', 200), id: 'cloud-a' }
    const cloudB = { ...sprite('nave', 300), id: 'cloud-b' }
    const local = fakeLocal([localNave])
    const { cloud } = fakeCloud(remoteOf([cloudA, cloudB]))
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })

    await loadSettled(mirrored, local)

    expect(new Set([...local.rows.values()].map((asset) => asset.name))).toEqual(
      new Set(['nave', 'nave-2', 'nave-3']),
    )
  })

  test('nuvem fora do ar: a galeria abre com o local (nunca lança)', async () => {
    const nave = sprite('nave', 1)
    const local = fakeLocal([nave])
    const { cloud } = fakeCloud(new Map())
    cloud.list = async () => {
      throw new TypeError('Failed to fetch')
    }
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })
    expect((await mirrored.listAllAssets()).map((a) => a.name)).toEqual(['nave'])
  })
})

describe('uniqueAssetName', () => {
  test('nunca passa do teto do pacote (48), mesmo com sufixo', () => {
    const long = 'a'.repeat(60)
    const taken = new Set([long.slice(0, 48)])
    const name = uniqueAssetName(long, taken)
    expect(name.length).toBeLessThanOrEqual(PINTA_LIMITS.maxNameChars)
    expect(name.endsWith('-2')).toBe(true)
  })
})

const libraryOf = (
  palettes: Array<{ id: string; name: string; updatedAt: number; hex: string }>,
  updatedAt = Math.max(0, ...palettes.map((p) => p.updatedAt)),
  removed: Array<{ id: string; removedAt: number }> = [],
): PaletteLibrary => ({
  version: 1,
  updatedAt,
  palettes: palettes.map((p) => ({
    id: p.id,
    name: p.name,
    updatedAt: p.updatedAt,
    colors: ['', p.hex, ...Array.from({ length: 14 }, () => '')],
  })),
  removed,
})

const paletteSummaryOf = (library: PaletteLibrary, revision = 1): CloudCreationSummary => ({
  itemId: PALETTE_LIBRARY_ITEM_ID,
  name: 'Minhas paletas',
  kind: PALETTE_LIBRARY_KIND,
  itemUpdatedAt: library.updatedAt,
  revision,
  bytes: 10,
  thumb: null,
  syncedAt: library.updatedAt,
})

describe('biblioteca "Minhas paletas" no espelho da nuvem', () => {
  test('salvar a biblioteca enfileira o item ESPECIAL (kind próprio); o commit avança a marca', async () => {
    const local = fakeLocal()
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({ local, cloud, viewerId: 'p1', marks })

    const library = libraryOf([{ id: 'a', name: 'Céu', updatedAt: 100, hex: '#87f2ff' }])
    await mirrored.savePaletteLibrary?.(library)
    expect(local.library.current?.palettes).toHaveLength(1)

    const job = uploads.get(PALETTE_LIBRARY_ITEM_ID)
    expect(job).toBeDefined()
    const snapshot = await job?.produce()
    expect(snapshot?.meta).toEqual({
      name: 'Minhas paletas',
      kind: PALETTE_LIBRARY_KIND,
      updatedAt: 100,
      baseRevision: 0,
    })
    job?.onUploaded?.({ itemId: PALETTE_LIBRARY_ITEM_ID, updatedAt: 100, revision: 2 })
    expect(marks.get(PALETTE_LIBRARY_ITEM_ID)).toBe(100)
    // Nada mudou desde o commit: o produtor devolve null (zero HTTP).
    expect(await job?.produce()).toBeNull()
  })

  test('reconciliação: o item especial NÃO vira asset; a biblioteca desce e FUNDE por updatedAt', async () => {
    const nuvemLib = libraryOf([
      { id: 'a', name: 'Céu novo', updatedAt: 7, hex: '#aaaaaa' },
      { id: 'c', name: 'Lava', updatedAt: 3, hex: '#cccccc' },
    ])
    const remoto = sprite('da-nuvem', 500)
    const remote = remoteOf([remoto])
    remote.set(PALETTE_LIBRARY_ITEM_ID, {
      json: JSON.stringify(nuvemLib),
      summary: paletteSummaryOf(nuvemLib, 4),
    })
    const local = fakeLocal()
    local.library.current = libraryOf([
      { id: 'a', name: 'Céu velho', updatedAt: 5, hex: '#111111' },
      { id: 'b', name: 'Minha', updatedAt: 9, hex: '#222222' },
    ])
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({ local, cloud, viewerId: 'p1', marks })

    const assets = await loadSettled(mirrored, local)
    await new Promise((resolve) => setTimeout(resolve, 20))

    // O desenho da nuvem desceu; o item especial NUNCA vira asset local.
    expect(assets.map((a) => a.name)).toContain('da-nuvem')
    expect(local.rows.has(PALETTE_LIBRARY_ITEM_ID)).toBe(false)

    // Merge por id + updatedAt: 'a' da nuvem (7 > 5) vence; 'b' local fica; 'c' entra.
    const merged = local.library.current
    expect(merged?.palettes.map((p) => [p.id, p.name])).toEqual([
      ['a', 'Céu novo'],
      ['b', 'Minha'],
      ['c', 'Lava'],
    ])
    // A marca conhece a revisão da nuvem, e o merge (tem 'b' a mais) sobe de novo.
    expect(marks.revision(PALETTE_LIBRARY_ITEM_ID)).toBe(4)
    expect(uploads.has(PALETTE_LIBRARY_ITEM_ID)).toBe(true)
  })

  test('base vencida na subida: onStale funde com a nuvem e re-sobe', async () => {
    const nuvemLib = libraryOf([
      { id: 'x', name: 'De outro aparelho', updatedAt: 50, hex: '#ff0000' },
    ])
    const remote = new Map([
      [
        PALETTE_LIBRARY_ITEM_ID,
        { json: JSON.stringify(nuvemLib), summary: paletteSummaryOf(nuvemLib, 9) },
      ],
    ])
    const local = fakeLocal()
    local.library.current = libraryOf([{ id: 'y', name: 'Daqui', updatedAt: 60, hex: '#00ff00' }])
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({ local, cloud, viewerId: 'p1', marks })

    await mirrored.savePaletteLibrary?.(local.library.current)
    await uploads.get(PALETTE_LIBRARY_ITEM_ID)?.onStale?.({ itemId: PALETTE_LIBRARY_ITEM_ID })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(local.library.current?.palettes.map((p) => p.id).sort()).toEqual(['x', 'y'])
    expect(marks.revision(PALETTE_LIBRARY_ITEM_ID)).toBe(9)
    // O merge difere do remoto (tem 'y'): a subida foi re-enfileirada e o
    // produtor tem o que subir (o carimbo novo é maior que a marca).
    expect(await uploads.get(PALETTE_LIBRARY_ITEM_ID)?.produce()).not.toBeNull()
  })

  test('nuvem sem o item: biblioteca local COM conteúdo sobe na reconciliação', async () => {
    const local = fakeLocal()
    local.library.current = libraryOf([{ id: 'a', name: 'Céu', updatedAt: 5, hex: '#87f2ff' }])
    const { cloud, uploads } = fakeCloud(remoteOf([]))
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'p1',
      marks: createMemorySyncedMarks(),
    })
    await loadSettled(mirrored, local)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(uploads.has(PALETTE_LIBRARY_ITEM_ID)).toBe(true)
  })
})

describe('lápides e convergência da biblioteca (full review 25/08)', () => {
  test('🚨 EXCLUIR vale por mera reconciliação: a lápide da nuvem mata a cópia local', async () => {
    // O outro aparelho excluiu p1 e subiu a lib SEM p1 + a lápide. ESTE
    // aparelho ainda tem p1 e não editou nada — antes das lápides, o merge
    // ressuscitava p1 daqui e o re-subia (o achado ALTO do review).
    const nuvemLib = libraryOf([{ id: 'p2', name: 'Fica', updatedAt: 10, hex: '#222222' }], 60, [
      { id: 'p1', removedAt: 50 },
    ])
    const remote = new Map([
      [
        PALETTE_LIBRARY_ITEM_ID,
        { json: JSON.stringify(nuvemLib), summary: paletteSummaryOf(nuvemLib, 7) },
      ],
    ])
    const local = fakeLocal()
    local.library.current = libraryOf([
      { id: 'p1', name: 'Excluída lá', updatedAt: 5, hex: '#111111' },
      { id: 'p2', name: 'Fica', updatedAt: 10, hex: '#222222' },
    ])
    const { cloud, uploads } = fakeCloud(remote)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'p1',
      marks: createMemorySyncedMarks(),
    })
    await loadSettled(mirrored, local)
    await new Promise((resolve) => setTimeout(resolve, 20))

    // p1 morreu aqui também; e o conteúdo agora é IGUAL ao remoto → nada sobe.
    expect(local.library.current?.palettes.map((p) => p.id)).toEqual(['p2'])
    expect(local.library.current?.removed).toEqual([{ id: 'p1', removedAt: 50 }])
    const job = uploads.get(PALETTE_LIBRARY_ITEM_ID)
    expect(job ? await job.produce() : null).toBeNull()
  })

  test('mesmo CONTEÚDO em ordens diferentes NÃO re-sobe (mata o pingue-pongue)', async () => {
    // A nuvem tem [pB, pA]; este aparelho tem [pA, pB] — conteúdo idêntico. A
    // comparação sensível à ordem fazia cada reconciliação subir de novo, para
    // sempre, entre dois aparelhos com ordens locais diferentes.
    const pA = { id: 'a', name: 'A', updatedAt: 5, hex: '#aaaaaa' }
    const pB = { id: 'b', name: 'B', updatedAt: 7, hex: '#bbbbbb' }
    const nuvemLib = libraryOf([pB, pA])
    const remote = new Map([
      [
        PALETTE_LIBRARY_ITEM_ID,
        { json: JSON.stringify(nuvemLib), summary: paletteSummaryOf(nuvemLib, 3) },
      ],
    ])
    const local = fakeLocal()
    local.library.current = libraryOf([pA, pB])
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({ local, cloud, viewerId: 'p1', marks })
    await loadSettled(mirrored, local)
    await new Promise((resolve) => setTimeout(resolve, 20))

    // A marca conhece a revisão da nuvem e NADA foi enfileirado para subir
    // (ou, se o job existir de uma rodada anterior, o produtor devolve null).
    expect(marks.revision(PALETTE_LIBRARY_ITEM_ID)).toBe(3)
    const job = uploads.get(PALETTE_LIBRARY_ITEM_ID)
    expect(job ? await job.produce() : null).toBeNull()
  })
})
