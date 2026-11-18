/**
 * O espelho do Pinta: gravar local ENFILEIRA a subida (o `.pinta.json` do desenho, id
 * preservado) e a marca só avança no commit; apagar grava lápide e enfileira a remoção;
 * a 1ª carga da galeria DESCE o que só existe na nuvem gravando direto no local (id
 * preservado, sem passar pelo embrulho), com nome único e sem reintroduzir teto de quantidade;
 * conflito real vira `-copia` DEPOIS de a descida ter sido baixada e validada.
 */
import { describe, expect, test } from 'bun:test'
import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import type { PaletteLibrary, PintaAsset } from '@sistemazero/pinta/assets'
import {
  assetFromJson,
  assetToJson,
  createAsset,
  PINTA_LIMITS,
  sanitizePintaAsset,
} from '@sistemazero/pinta/assets'
import type {
  CloudCreationSummary,
  CreationsCloud,
  RemovedListener,
  SnapshotProducer,
  StaleListener,
  UploadedListener,
} from '../src/lib/creations-cloud'
import {
  createMemorySyncedMarks,
  createStoredSyncedMarks,
  resetStoredSyncedMarksForTests,
} from '../src/lib/creations-sync'
import {
  createCloudMirroredPintaPersistence,
  createMemoryPintaFormatMemory,
  createStoredPintaFormatMemory,
  PALETTE_LIBRARY_ITEM_ID,
  PALETTE_LIBRARY_KIND,
  type PintaFormatMemory,
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
      return next
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
    tool: 'pinta',
    supported: true,
    list: async () => {
      lists.count += 1
      return [...remote.values()].map((r) => r.summary)
    },
    upload: async () => ({ revision: 1 }),
    // O rascunho da aula consulta sem baixar; estas filas não usam.
    peek: async () => null,
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
    confirm: async () => {
      throw new Error('A galeria livre não confirma avanços de aula')
    },
    getState: () => ({ status: 'idle', pending: 0, lastSavedAt: null, lastError: null }),
    subscribe: () => () => {},
    getItemState: () => ({ status: 'idle', lastError: null, code: null }),
    subscribeItems: () => () => {},
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

  test('apagar local grava LÁPIDE com a revisão conhecida e o DELETE leva essa base (nunca 0); a confirmação marca a lápide como enviada', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000, 5)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.deleteAsset(nave.id)
    expect(local.rows.has(nave.id)).toBe(false)
    // A marca some, mas a revisão foi para a lápide ANTES (o defeito de 06/09 mandava base 0).
    expect(marks.revision(nave.id)).toBeUndefined()
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([[nave.id, 5]])
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: false, revision: 5 })
    removed[0]?.onRemoved?.({ revision: 5 })
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: true, revision: 5 })
  })

  test('409 no DELETE: lápide sem revisão → reenvia UMA vez com a revisão corrente da nuvem; revisão MAIOR (editou em outro aparelho) → o desenho volta e a lápide só sai depois de gravar', async () => {
    // Mesma história: a lápide não conhecia revisão (base 0) e a nuvem está na 5.
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(
      new Map([[nave.id, { json: assetToJson(nave), summary: summaryOf(nave, { revision: 5 }) }]]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.deleteAsset(nave.id)
    await removed[0]?.onStale?.({ itemId: nave.id, currentRevision: 5 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [nave.id, 0],
      [nave.id, 5],
    ])
    expect(local.rows.has(nave.id)).toBe(false)
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: false, revision: 5 })

    // Alguém editou depois: a revisão corrente (7) é maior que a conhecida (5).
    const theirs: PintaAsset = { ...nave, updatedAt: 2000 }
    const local2 = fakeLocal([nave])
    const { cloud: cloud2, removed: removed2 } = fakeCloud(
      new Map([
        [nave.id, { json: assetToJson(theirs), summary: summaryOf(theirs, { revision: 7 }) }],
      ]),
    )
    const marks2 = createMemorySyncedMarks()
    marks2.set(nave.id, 1000, 5)
    const mirrored2 = createCloudMirroredPintaPersistence({
      local: local2,
      cloud: cloud2,
      viewerId: 'perfil-1',
      marks: marks2,
      now: () => 4242,
    })
    await mirrored2.deleteAsset(nave.id)
    await removed2[0]?.onStale?.({ itemId: nave.id, currentRevision: 7 })
    expect(local2.rows.get(nave.id)?.updatedAt).toBe(2000)
    expect(marks2.revision(nave.id)).toBe(7)
    expect(marks2.tombstone(nave.id)).toBeUndefined()
    expect(removed2).toHaveLength(1)
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
  test('sincroniza apenas a biblioteca ao abrir o Molda, sem baixar desenhos do Pinta', async () => {
    const library = libraryOf([{ id: 'ceu', name: 'Céu', updatedAt: 100, hex: '#87f2ff' }])
    const drawing = sprite('desenho remoto', 200)
    const remote = remoteOf([drawing])
    remote.set(PALETTE_LIBRARY_ITEM_ID, {
      json: JSON.stringify(library),
      summary: paletteSummaryOf(library, 3),
    })
    const local = fakeLocal()
    const { cloud, lists } = fakeCloud(remote)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'p1',
      marks: createMemorySyncedMarks(),
    })

    await mirrored.syncPaletteLibrary?.()

    expect(lists.count).toBe(1)
    expect(local.library.current?.palettes.map((palette) => palette.id)).toEqual(['ceu'])
    expect(local.rows.size).toBe(0)
  })

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
    const events: string[] = []
    mirrored.subscribe?.((event) => events.push(event.type))

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
    expect(events).toContain('palette-library-changed')
  })

  test('reconciliação re-sobe uma escrita concorrente que só apareceu no save atômico', async () => {
    const remoteLibrary = libraryOf([
      { id: 'remote', name: 'Remota', updatedAt: 100, hex: '#111111' },
    ])
    const remote = new Map([
      [
        PALETTE_LIBRARY_ITEM_ID,
        { json: JSON.stringify(remoteLibrary), summary: paletteSummaryOf(remoteLibrary, 7) },
      ],
    ])
    const local = fakeLocal()
    local.library.current = remoteLibrary
    let saves = 0
    local.savePaletteLibrary = async (next) => {
      saves += 1
      local.library.current =
        saves === 1
          ? libraryOf(
              [
                { id: 'remote', name: 'Remota', updatedAt: 100, hex: '#111111' },
                { id: 'local', name: 'Outra aba', updatedAt: 100, hex: '#222222' },
              ],
              100,
            )
          : next
      return local.library.current
    }
    const { cloud, uploads } = fakeCloud(remote)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'p1',
      marks: createMemorySyncedMarks(),
      now: () => 500,
    })

    await loadSettled(mirrored, local)

    expect(saves).toBe(2)
    expect(local.library.current?.updatedAt).toBe(500)
    expect(local.library.current?.palettes.map((palette) => palette.id)).toEqual([
      'remote',
      'local',
    ])
    expect(await uploads.get(PALETTE_LIBRARY_ITEM_ID)?.produce()).not.toBeNull()
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

describe('review 06/09: upload em voo × exclusão, flush antes da descida, desenho aberto, 2º 409', () => {
  test('a lápide que nasce DEPOIS de o envio começar sobrevive à confirmação (revisão nova) e é promovida a ela; a descida não restaura e o DELETE reenvia com essa base', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, uploads, removed } = fakeCloud(
      new Map([[nave.id, { json: assetToJson(nave), summary: summaryOf(nave, { revision: 4 }) }]]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 900, 3)
    let clock = 100
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => clock,
    })
    await mirrored.persistAsset(nave)
    const job = uploads.get(nave.id)
    // O produtor lê o disco: o envio começa em 100, com a base 3.
    expect((await job?.produce())?.meta?.baseRevision).toBe(3)
    // A criança apaga com o upload em voo: a lápide nasce em 101, com a revisão 3.
    clock = 101
    await mirrored.deleteAsset(nave.id)
    expect(marks.tombstone(nave.id)).toEqual({ at: 101, sent: false, revision: 3 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([[nave.id, 3]])
    // O commit confirma a revisão 4: a lápide FICA (não enviada) e passa a conhecer a 4.
    job?.onUploaded?.({ itemId: nave.id, updatedAt: 1000, revision: 4 })
    expect(marks.tombstone(nave.id)).toEqual({ at: 101, sent: false, revision: 4 })
    // A descida vê a nuvem na 4 = a revisão da lápide: nada de "editado em outro aparelho";
    // reenvia a remoção com a base que a nuvem listou e NÃO restaura.
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [nave.id, 3],
      [nave.id, 4],
    ])
    expect(marks.tombstone(nave.id)).toEqual({ at: 101, sent: false, revision: 4 })
    // O DELETE original (base 3) leva 409 com a corrente 4: mesma história, reenvia com a 4.
    await removed[0]?.onStale?.({ itemId: nave.id, currentRevision: 4 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [nave.id, 3],
      [nave.id, 4],
      [nave.id, 4],
    ])
    expect(local.rows.has(nave.id)).toBe(false)
    removed[2]?.onRemoved?.({ revision: 4 })
    expect(marks.tombstone(nave.id)).toEqual({ at: 101, sent: true, revision: 4 })
  })

  test('caso normal: apagar e DEPOIS salvar de novo o mesmo id limpa a lápide na confirmação', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, uploads } = fakeCloud(new Map())
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000, 3)
    let clock = 100
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => clock,
    })
    await mirrored.deleteAsset(nave.id)
    expect(marks.tombstone(nave.id)).toEqual({ at: 100, sent: false, revision: 3 })
    // O id voltou (recriado) e sobe DEPOIS da exclusão: a confirmação limpa a lápide.
    clock = 101
    await mirrored.persistAsset({ ...nave, updatedAt: 2000 })
    const job = uploads.get(nave.id)
    expect((await job?.produce())?.meta?.updatedAt).toBe(2000)
    job?.onUploaded?.({ itemId: nave.id, updatedAt: 2000, revision: 4 })
    expect(marks.tombstone(nave.id)).toBeUndefined()
    expect(marks.revision(nave.id)).toBe(4)
  })

  test('a reconciliação dá `flush` na fila (com teto) ANTES de ler a lista: um DELETE em voo sobe primeiro; a fila falhando não bloqueia a descida', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(remoteOf([nave]))
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
    marks.set(nave.id, 1000, 1)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
      reconcileMinIntervalMs: 0,
    })
    await mirrored.deleteAsset(nave.id)
    expect(removed).toHaveLength(1)
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(calls).toEqual(['flush', `delete:${nave.id}`, 'list'])
    expect(flushOptions).toEqual([{ timeoutMs: 3000 }])
    // O DELETE já confirmado: a lista ainda mostra o item, mas a lápide enviada segura a descida.
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: true, revision: 1 })
    expect(removed).toHaveLength(0)
    // A fila fora do ar não segura a galeria: a lista continua sendo lida.
    cloud.flush = async () => {
      calls.push('flush-falhou')
      throw new Error('fila caiu')
    }
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(calls.slice(3)).toEqual(['flush-falhou', 'list'])
  })

  test('restauro do 409 com o desenho ABERTO no editor: nada é gravado e a lápide sobrevive; fechado, o mesmo 409 restaura', async () => {
    const nave = sprite('nave', 1000)
    const theirs: PintaAsset = { ...nave, updatedAt: 2000 }
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(
      new Map([
        [nave.id, { json: assetToJson(theirs), summary: summaryOf(theirs, { revision: 7 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000, 5)
    let open = true
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
      isAssetOpen: (id) => open && id === nave.id,
    })
    await mirrored.deleteAsset(nave.id)
    // Alguém editou depois (7 > 5), mas o desenho está aberto: o restauro espera.
    await removed[0]?.onStale?.({ itemId: nave.id, currentRevision: 7 })
    expect(local.rows.has(nave.id)).toBe(false)
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: false, revision: 5 })
    expect(marks.revision(nave.id)).toBeUndefined()
    // Fechou: o mesmo 409 agora restaura, e a lápide só sai depois de gravar.
    open = false
    await removed[0]?.onStale?.({ itemId: nave.id, currentRevision: 7 })
    expect(local.rows.get(nave.id)?.updatedAt).toBe(2000)
    expect(marks.tombstone(nave.id)).toBeUndefined()
    expect(marks.revision(nave.id)).toBe(7)
  })

  test('2º 409 no DELETE (`retried`): a corrente cresceu de novo → o desenho volta no mesmo id, a marca conhece a revisão da nuvem e a lápide só sai DEPOIS de gravar', async () => {
    const nave = sprite('nave', 1000)
    const theirs: PintaAsset = { ...nave, updatedAt: 3000 }
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(
      new Map([
        [nave.id, { json: assetToJson(theirs), summary: summaryOf(theirs, { revision: 9 }) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000) // sem revisão: a lápide nasce sem revisão e o DELETE sai com base 0
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.deleteAsset(nave.id)
    // 1º 409: mesma história (lápide sem revisão), reenvia UMA vez com a 5.
    await removed[0]?.onStale?.({ itemId: nave.id, currentRevision: 5 })
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([
      [nave.id, 0],
      [nave.id, 5],
    ])
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: false, revision: 5 })
    // A lápide ainda existe na hora de GRAVAR o restauro (só sai depois).
    const tombstoneAtWrite: unknown[] = []
    const persist = local.persistAssets
    local.persistAssets = async (assets) => {
      tombstoneAtWrite.push(marks.tombstone(nave.id))
      return persist(assets)
    }
    // 2º 409 (`retried`): a corrente é 9 > 5, alguém editou entre os dois envios → restaura.
    await removed[1]?.onStale?.({ itemId: nave.id, currentRevision: 9 })
    expect(local.rows.get(nave.id)?.updatedAt).toBe(3000)
    expect(marks.revision(nave.id)).toBe(9)
    expect(tombstoneAtWrite).toEqual([{ at: 4242, sent: false, revision: 5 }])
    expect(marks.tombstone(nave.id)).toBeUndefined()
    // Nenhum 3º DELETE: o reenvio é UMA vez só.
    expect(removed).toHaveLength(2)
  })

  test('2º 409 sem `currentRevision` com a nuvem já sem o desenho: a lápide vira enviada, nada restaura', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(new Map()) // download → null
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.deleteAsset(nave.id)
    await removed[0]?.onStale?.({ itemId: nave.id, currentRevision: 5 })
    await removed[1]?.onStale?.({ itemId: nave.id })
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: true, revision: 5 })
    expect(local.rows.has(nave.id)).toBe(false)
    expect(removed).toHaveLength(2)
  })

  test('lápide legada `{revision: null}` (dado já em produção): a descida reenvia o DELETE com a revisão da NUVEM e nada é restaurado', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal()
    const { cloud, removed } = fakeCloud(
      new Map([[nave.id, { json: assetToJson(nave), summary: summaryOf(nave, { revision: 3 }) }]]),
    )
    const marks = createMemorySyncedMarks()
    marks.setTombstone(nave.id, { at: 500, sent: false, revision: null })
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(removed.map((r) => [r.itemId, r.baseRevision])).toEqual([[nave.id, 3]])
    expect(marks.tombstone(nave.id)).toEqual({ at: 500, sent: false, revision: null })
    removed[0]?.onRemoved?.({ revision: 3 })
    expect(marks.tombstone(nave.id)).toEqual({ at: 500, sent: true, revision: 3 })
  })
})

describe('formato mais novo que este código: o desenho fica intocado na conta', () => {
  const FUTURO = 99
  const mapaNovo = (asset: PintaAsset, over: Partial<CloudCreationSummary> = {}) => ({
    json: assetToJson(asset),
    summary: summaryOf(asset, { formatVersion: FUTURO, ...over }),
  })

  test('download que mudou de formato após a listagem fica intocado e bloqueia a subida local', async () => {
    const asset = createAsset({ kind: 'tileset', name: 'pecas', tileSize: 16 }),
      local = fakeLocal(),
      marks = createMemorySyncedMarks()
    const { cloud, uploads } = fakeCloud(
      new Map([
        [
          asset.id,
          {
            json: assetToJson(asset),
            summary: summaryOf(asset, { formatVersion: 3, revision: 1 }),
          },
        ],
      ]),
    )
    const current = summaryOf(asset, { formatVersion: FUTURO, revision: 2 })
    cloud.download = async () => ({
      json: assetToJson(asset),
      summary: current,
      parts: [],
      fetchPart: async () => {
        throw new Error('sem partes')
      },
    })
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      marks,
      viewerId: 'perfil-1',
    })
    expect(await loadSettled(mirrored, local)).toEqual([])
    expect(marks.revision(asset.id)).toBeUndefined()
    expect(mirrored.getReadIssues?.()).toEqual([
      { id: asset.id, name: asset.name, status: 'unsupported', version: FUTURO },
    ])
    await mirrored.persistAssets([asset])
    expect(await uploads.get(asset.id)?.produce()).toBeNull()
  })

  test('a reconciliação não desce o item, não o copia e não sobe a versão daqui por cima; a galeria recebe o aviso', async () => {
    const mine = sprite('vila', 1000)
    const theirs: PintaAsset = { ...mine, updatedAt: 5000 }
    const soLa = sprite('floresta', 3000)
    const normal = sprite('nave', 2000)
    const local = fakeLocal([mine])
    const { cloud, uploads } = fakeCloud(
      new Map([
        [mine.id, mapaNovo(theirs, { revision: 9 })],
        [soLa.id, mapaNovo(soLa)],
        [normal.id, { json: assetToJson(normal), summary: summaryOf(normal) }],
      ]),
    )
    const marks = createMemorySyncedMarks()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
    })
    expect(mirrored.getReadIssues?.()).toEqual([])
    const depois = await loadSettled(mirrored, local)
    // O que este código lê desce como sempre; os dois de formato novo ficam onde estão.
    expect(depois.map((a) => a.name).sort()).toEqual(['nave', 'vila'])
    expect(local.rows.get(mine.id)?.updatedAt).toBe(1000)
    expect(local.rows.has(soLa.id)).toBe(false)
    expect(depois.some((a) => a.name.includes('copia'))).toBe(false)
    // Nem a marca avança (carimbos não dão por sincronizado o que não foi lido)…
    expect(marks.get(mine.id)).toBeUndefined()
    expect(marks.revision(mine.id)).toBeUndefined()
    // …nem a cópia daqui entra na fila.
    expect(uploads.has(mine.id)).toBe(false)
    expect(
      mirrored
        .getReadIssues?.()
        .map((i) => [i.name, i.status, i.version])
        .sort(),
    ).toEqual([
      ['floresta', 'unsupported', FUTURO],
      ['vila', 'unsupported', FUTURO],
    ])
  })

  test('editar a cópia daqui não sobe por cima: o produtor devolve null enquanto a conta guarda o formato novo', async () => {
    const mine = sprite('vila', 1000)
    const local = fakeLocal([mine])
    const { cloud, uploads } = fakeCloud(
      new Map([[mine.id, mapaNovo({ ...mine, updatedAt: 5000 })]]),
    )
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })
    await loadSettled(mirrored, local)
    await mirrored.persistAssets([{ ...mine, updatedAt: 7000 }])
    expect(await uploads.get(mine.id)?.produce()).toBeNull()
  })

  test('base vencida na subida com a nuvem em formato novo: sem cópia, sem nova subida, marca parada', async () => {
    const mine = sprite('vila', 1000)
    const local = fakeLocal([mine])
    const { cloud, uploads } = fakeCloud(
      new Map([[mine.id, mapaNovo({ ...mine, updatedAt: 5000 }, { revision: 7 })]]),
    )
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
    uploads.clear()
    await job?.onStale?.({ itemId: mine.id })
    expect((await local.listAllAssets()).map((a) => a.name)).toEqual(['vila'])
    expect(uploads.size).toBe(0)
    expect(marks.revision(mine.id)).toBeUndefined()
    expect(mirrored.getReadIssues?.().map((i) => i.id)).toEqual([mine.id])
  })

  test('DELETE recusado porque editaram em formato novo: nada é restaurado aqui e a lápide fica', async () => {
    const nave = sprite('nave', 1000)
    const local = fakeLocal([nave])
    const { cloud, removed } = fakeCloud(
      new Map([[nave.id, mapaNovo({ ...nave, updatedAt: 2000 }, { revision: 7 })]]),
    )
    const marks = createMemorySyncedMarks()
    marks.set(nave.id, 1000, 5)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      now: () => 4242,
    })
    await mirrored.deleteAsset(nave.id)
    await removed[0]?.onStale?.({ itemId: nave.id, currentRevision: 7 })
    expect(local.rows.has(nave.id)).toBe(false)
    expect(marks.tombstone(nave.id)).toEqual({ at: 4242, sent: false, revision: 5 })
    expect(removed).toHaveLength(1)
    expect(mirrored.getReadIssues?.().map((i) => i.id)).toEqual([nave.id])
  })

  test('o aviso some quando o item passa a ser legível ou sai da conta; lápide remota nunca vira aviso', async () => {
    const vila = sprite('vila', 1000)
    const apagado = sprite('velho', 1000)
    const remote = new Map([
      [vila.id, mapaNovo(vila)],
      [apagado.id, mapaNovo(apagado, { deletedAt: 3000 })],
    ])
    const local = fakeLocal()
    const { cloud } = fakeCloud(remote)
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
      reconcileMinIntervalMs: 0,
    })
    await loadSettled(mirrored, local)
    expect(mirrored.getReadIssues?.().map((i) => i.id)).toEqual([vila.id])
    remote.set(vila.id, { json: assetToJson(vila), summary: summaryOf(vila) })
    const depois = await loadSettled(mirrored, local)
    expect(mirrored.getReadIssues?.()).toEqual([])
    expect(depois.map((a) => a.name)).toEqual(['vila'])
  })

  test('a versão declarada na subida vem do tipo do desenho e a 1 não entra no corpo', async () => {
    const local = fakeLocal()
    const { cloud, uploads } = fakeCloud(new Map())
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
    })
    const pecas = {
      ...createAsset({ kind: 'tileset', name: 'pecas', tileSize: 16 }),
      updatedAt: 10,
    }
    await mirrored.persistAssets([pecas])
    const meta = (await uploads.get(pecas.id)?.produce())?.meta as { formatVersion?: number }
    const esperado = pintaWriteFormatVersion('tileset')
    expect(meta.formatVersion).toBe(esperado > 1 ? esperado : undefined)
    expect(pintaWriteFormatVersion('pixel-sprite')).toBe(1)
  })
})

/**
 * FROTA MISTA no mesmo aparelho (18/11/2026). Outra aba, ainda com o Pinta antigo carregado, abre
 * um mapa completo do IndexedDB, reconstrói o registro sem o que não conhece e salva por cima com
 * `updatedAt` novo. Nos testes isso é gravar direto em `local.rows`, por fora do embrulho: é o
 * que distingue a gravação de outro código da gravação deste.
 */
describe('registro local cortado por código mais antigo não sobe por cima da conta', () => {
  test('mapa fracionário sobe como nativo/envelope 5 e capacidade 4, sem confundir os eixos', async () => {
    const map = createAsset({
      kind: 'tilemap',
      name: 'fracao',
      tilesetId: 'pecas',
      cols: 2,
      rows: 2,
    })
    if (map.kind !== 'tilemap') throw new Error('Mapa esperado')
    map.layers[0]!.offsetX = 16.5
    map.layers[0]!.offsetY = 0.25
    const { cloud, uploads } = fakeCloud(new Map())
    const mirrored = createCloudMirroredPintaPersistence({
      local: fakeLocal(),
      cloud,
      viewerId: 'fracao',
      marks: createMemorySyncedMarks(),
    })
    await mirrored.persistAsset(map)
    const result = await uploads.get(map.id)?.produce()
    expect(result?.meta).toMatchObject({ formatVersion: 4 })
    const native = JSON.parse(result?.json ?? '{}')
    expect(native.version).toBe(5)
    expect(native.assets[0]).toMatchObject({
      schema: 5,
      layers: [{ offsetX: 16.5, offsetY: 0.25 }],
    })
    mirrored.dispose?.()
  })
  const ler = (cru: unknown): PintaAsset => {
    const lido = sanitizePintaAsset(cru)
    if (!lido) throw new Error('mapa de teste inválido')
    return lido
  }
  /** Mapa com um objeto em forma de elipse: pede o carimbo 4. */
  const mapaCompleto = (updatedAt: number): PintaAsset =>
    ler({
      id: 'mapa-vila',
      kind: 'tilemap',
      name: 'vila',
      createdAt: 1,
      updatedAt,
      tilesetId: 'pecas',
      cols: 2,
      rows: 1,
      layers: [
        { id: 'chao', name: 'Chão', visible: true, cells: [0, -1] },
        {
          id: 'coisas',
          kind: 'objects',
          name: 'Coisas',
          visible: true,
          objects: [
            {
              id: 'lago',
              name: 'lago',
              type: '',
              x: 0,
              y: 0,
              width: 16,
              height: 16,
              properties: {},
              shape: 'ellipse',
              role: 'danger',
            },
          ],
        },
      ],
    })
  /** O que o código antigo devolve ao ler o mapa: o objeto sem forma nem papel, sem carimbo. */
  const cortado = (completo: PintaAsset, updatedAt: number, cells = [0, -1]): PintaAsset => {
    if (completo.kind !== 'tilemap') throw new Error('esperava um mapa')
    return ler({
      ...completo,
      schema: undefined,
      updatedAt,
      layers: completo.layers.map((layer) =>
        layer.kind === 'objects'
          ? {
              ...layer,
              objects: layer.objects.map(({ shape: _s, role: _r, ...objeto }) => objeto),
            }
          : { ...layer, cells },
      ),
    })
  }
  const carimbo = (asset: PintaAsset | undefined): number | undefined =>
    (asset as { schema?: number } | undefined)?.schema
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

  /** Sincroniza o mapa completo por este código e devolve o cenário pronto para o corte. */
  async function sincronizado(over: { isAssetOpen?: (id: string) => boolean } = {}) {
    const completo = mapaCompleto(1000)
    expect(carimbo(completo)).toBe(4)
    const local = fakeLocal()
    const remote = new Map<string, { summary: CloudCreationSummary; json: string }>()
    const { cloud, uploads } = fakeCloud(remote)
    const marks = createMemorySyncedMarks()
    const formatMemory = createMemoryPintaFormatMemory()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks,
      formatMemory,
      now: () => 9000,
      ...over,
    })
    await mirrored.persistAssets([completo])
    const primeiro = await uploads.get(completo.id)?.produce()
    expect(primeiro?.meta?.updatedAt).toBe(1000)
    uploads.get(completo.id)?.onUploaded?.({ itemId: completo.id, updatedAt: 1000, revision: 4 })
    remote.set(completo.id, {
      json: assetToJson(completo),
      summary: summaryOf(completo, { revision: 4, formatVersion: 3 }),
    })
    expect(formatMemory.get(completo.id)?.schema).toBe(4)
    return { completo, local, remote, cloud, uploads, marks, formatMemory, mirrored }
  }

  async function quotaRestart(
    run: (context: {
      complete: PintaAsset
      cut: PintaAsset
      mirrored: PintaPersistenceLike
      local: ReturnType<typeof fakeLocal>
      remote: Map<string, { summary: CloudCreationSummary; json: string }>
      cloud: CreationsCloud
      uploads: ReturnType<typeof fakeCloud>['uploads']
      requests: { downloads: number; offline: boolean }
    }) => Promise<void>,
    options: { cut?: boolean; restart?: boolean } = {},
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const rows = new Map<string, string>()
    const storage: Storage = {
      get length() {
        return rows.size
      },
      key: (i) => [...rows.keys()][i] ?? null,
      getItem: (key) => rows.get(key) ?? null,
      setItem: (key, value) => {
        // A marca existente cabe; a nova chave de formato não cabe na quota.
        if (key.endsWith(':formato')) throw new Error('QuotaExceededError')
        rows.set(key, value)
      },
      removeItem: (key) => {
        rows.delete(key)
      },
      clear: () => rows.clear(),
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
    const wrappers: PintaPersistenceLike[] = []
    resetStoredSyncedMarksForTests()
    try {
      const base = mapaCompleto(1000)
      if (base.kind !== 'tilemap') throw new Error('Mapa esperado')
      const complete = ler({
        ...base,
        layers: base.layers.map((layer, i) =>
          i === 0 ? { ...layer, offsetX: 16.5, offsetY: 0.25 } : layer,
        ),
      })
      const cut = ler({
        ...base,
        schema: undefined,
        updatedAt: 2000,
        layers: [{ id: 'chao', name: 'Chão', visible: true, cells: [0, -1] }],
      })
      const local = fakeLocal()
      const remote = new Map<string, { summary: CloudCreationSummary; json: string }>()
      const { cloud, uploads } = fakeCloud(remote)
      const key = 'sz:creations-synced:pinta:quota-restart'
      const marks = createStoredSyncedMarks(key)
      // A chave de marcas já existia antes de faltar espaço: trocar a revisão cabe, criar a
      // nova chave de formato não. É um projeto legado que este espelho está evoluindo.
      const previous = { ...cut, updatedAt: 900 }
      remote.set(complete.id, {
        json: assetToJson(previous),
        summary: summaryOf(previous, { revision: 1, formatVersion: 3 }),
      })
      marks.set(complete.id, 900, 1)
      marks.flush?.()
      const memory = createStoredPintaFormatMemory(`${key}:formato`)
      const first = createCloudMirroredPintaPersistence({
        local,
        cloud,
        viewerId: 'quota-restart',
        marks,
        formatMemory: memory,
        now: () => 9000,
      })
      wrappers.push(first)
      await first.persistAsset(complete)
      expect((await uploads.get(complete.id)?.produce())?.meta?.formatVersion).toBe(4)
      uploads.get(complete.id)?.onUploaded?.({ itemId: complete.id, updatedAt: 1000, revision: 2 })
      marks.flush?.()
      expect(memory.get(complete.id)?.schema).toBe(5)
      expect(rows.has(`${key}:formato`)).toBe(false)
      remote.set(complete.id, {
        json: assetToJson(complete),
        summary: summaryOf(complete, { revision: 2, formatVersion: 4 }),
      })
      const requests = { downloads: 0, offline: false }
      const download = cloud.download
      cloud.download = async (...args) => {
        requests.downloads++
        if (requests.offline) throw new Error('offline')
        return download(...args)
      }
      let mirrored = first
      if (options.restart !== false) {
        first.dispose?.()
        resetStoredSyncedMarksForTests()
        const nextMarks = createStoredSyncedMarks(key)
        const nextMemory = createStoredPintaFormatMemory(`${key}:formato`)
        expect(nextMarks.revision(complete.id)).toBe(2)
        expect(nextMemory.get(complete.id)).toBeUndefined()
        mirrored = createCloudMirroredPintaPersistence({
          local,
          cloud,
          viewerId: 'quota-restart',
          marks: nextMarks,
          formatMemory: nextMemory,
          now: () => 9000,
        })
        wrappers.push(mirrored)
      }
      if (options.cut !== false) local.rows.set(complete.id, cut)
      await run({ complete, cut, local, remote, mirrored, cloud, uploads, requests })
    } finally {
      for (const wrapper of wrappers) wrapper.dispose?.()
      resetStoredSyncedMarksForTests()
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }

  async function upgraded(
    run: (ctx: {
      initial: PintaAsset
      full: PintaAsset
      ram: PintaAsset
      local: ReturnType<typeof fakeLocal>
      remote: Map<string, { summary: CloudCreationSummary; json: string }>
      a: ReturnType<typeof fakeCloud>
      mirror: PintaPersistenceLike
      other: PintaPersistenceLike
      memory: PintaFormatMemory
      marks: ReturnType<typeof createMemorySyncedMarks>
      downloads: { count: number }
      promote: () => Promise<void>
    }) => Promise<void>,
    options: { sharedMemory?: boolean; legacy?: boolean; promote?: boolean } = {},
  ) {
    const rich = mapaCompleto(1000)
    if (rich.kind !== 'tilemap') throw new Error('Mapa esperado')
    const initial = options.legacy ? ler({ ...rich, layers: [rich.layers[0]] }) : rich
    const ram = structuredClone(initial)
    const full = ler({
      ...rich,
      updatedAt: 2000,
      layers: rich.layers.map((layer, i) =>
        i === 0 ? { ...layer, offsetX: 16.5, offsetY: 0.25 } : layer,
      ),
    })
    const local = fakeLocal()
    const remote = new Map<string, { summary: CloudCreationSummary; json: string }>()
    const a = fakeCloud(remote),
      b = fakeCloud(remote),
      marks = createMemorySyncedMarks()
    const memory = createMemoryPintaFormatMemory()
    const mirror = createCloudMirroredPintaPersistence({
      local,
      cloud: a.cloud,
      viewerId: 'A',
      marks,
      formatMemory: memory,
      now: () => 9000,
    })
    const mirrorB = createCloudMirroredPintaPersistence({
      local,
      cloud: b.cloud,
      viewerId: 'B',
      marks,
      formatMemory: options.sharedMemory ? memory : createMemoryPintaFormatMemory(),
      now: () => 9000,
    })
    const confirm = async (asset: PintaAsset, uploads: typeof a.uploads, revision: number) => {
      const queued = uploads.get(asset.id)!
      const payload = await queued.produce()
      expect(payload).not.toBeNull()
      remote.set(asset.id, {
        json: payload!.json,
        summary: summaryOf(asset, { formatVersion: 4, revision }),
      })
      queued.onUploaded?.({ itemId: asset.id, updatedAt: asset.updatedAt, revision })
    }
    try {
      await mirror.persistAsset(initial)
      await confirm(initial, a.uploads, 2)
      await mirror.loadAssetById(initial.id) // A/RAM nasceu na revisão 2, antes de B publicar.
      await mirrorB.loadAssetById(initial.id)
      const promote = async () => {
        await mirrorB.persistAsset(full)
        await confirm(full, b.uploads, 3)
      }
      if (options.promote !== false) await promote()
      const downloads = { count: 0 },
        download = a.cloud.download
      a.cloud.download = async (...args) => {
        downloads.count++
        return download(...args)
      }
      await run({
        initial,
        full,
        ram,
        local,
        remote,
        a,
        mirror,
        memory,
        marks,
        downloads,
        promote,
        other: mirrorB,
      })
    } finally {
      mirror.dispose?.()
      mirrorB.dispose?.()
    }
  }

  test.each([
    false,
    true,
  ])('revisão compartilhada invalida floor/cache legado privado: legado=%s', async (legacy) =>
    upgraded(
      async ({ full, ram, local, mirror, a, marks, downloads }) => {
        local.rows.set(full.id, { ...ram, updatedAt: 3000 })
        expect(marks.revision(full.id)).toBe(3)
        await loadSettled(mirror, local)
        expect(await a.uploads.get(full.id)!.produce()).toBeNull()
        await tick()
        expect(local.rows.get(full.id)).toEqual(full)
        expect(downloads.count).toBe(1)
      },
      { legacy },
    ))

  test.each([
    false,
    true,
  ])('writtenAt do gravador antigo não autentica RAM4, inclusive persist direto=%s', async (direct) =>
    upgraded(
      async ({ full, ram, local, mirror, a, memory }) => {
        const oldSave = { ...ram, updatedAt: 3000 }
        // O noteWrittenHere real de 567b93f95 faz exatamente esse spread, preservando extras.
        memory.set(full.id, { ...memory.get(full.id)!, writtenAt: oldSave.updatedAt })
        local.rows.set(full.id, oldSave)
        if (direct) await mirror.persistAsset({ ...oldSave, updatedAt: 4000 })
        else await loadSettled(mirror, local)
        expect(await a.uploads.get(full.id)!.produce()).toBeNull()
        await tick()
        expect(local.rows.get(full.id)).toEqual(full)
      },
      { sharedMemory: true },
    ))

  test('RAM4 carregada na revisão2 não vira downgrade autorizado da revisão3 só porque o disco virou5', async () =>
    upgraded(
      async ({ full, ram, local, mirror, a }) => {
        expect(local.rows.get(full.id)).toEqual(full)
        await mirror.persistAsset({ ...ram, updatedAt: 3000 })
        expect(await a.uploads.get(full.id)!.produce()).toBeNull()
        await tick()
        expect(local.rows.get(full.id)).toEqual(full)
      },
      { sharedMemory: true },
    ))

  test('load canônico5 na revisão3 permite downgrade legítimo com schema antigo em memória', async () =>
    upgraded(
      async ({ full, mirror, a }) => {
        await mirror.loadAssetById(full.id)
        const legacy = cortado(full, 3000)
        if (legacy.kind !== 'tilemap') throw new Error('Mapa esperado')
        const plain = {
          ...legacy,
          schema: 5,
          layers: legacy.layers.map((layer) => {
            const { offsetX: _x, offsetY: _y, ...rest } = layer
            return rest
          }),
        }
        await mirror.persistAsset(plain)
        const payload = await a.uploads.get(full.id)!.produce()
        expect(payload?.meta?.baseRevision).toBe(3)
        expect(JSON.parse(payload!.json).version).toBe(2)
      },
      { sharedMemory: true },
    ))

  test('assinatura com capacidade nativa menor que o floor não autoriza o rebaixamento', async () =>
    upgraded(
      async ({ full, ram, local, mirror, a, memory }) => {
        memory.set(full.id, {
          ...memory.get(full.id)!,
          writtenAt: 3000,
          signature: { at: 3000, schema: 4, revision: 3, maxSchema: 4, writerId: 'older-writer' },
        })
        local.rows.set(full.id, { ...ram, updatedAt: 3000 })
        await loadSettled(mirror, local)
        expect(await a.uploads.get(full.id)!.produce()).toBeNull()
        await tick()
        expect(local.rows.get(full.id)).toEqual(full)
      },
      { sharedMemory: true },
    ))

  test('marca avança durante a consulta: payload conserva a CAS capturada, sem adotar revisão nova', async () =>
    upgraded(
      async ({ initial, full, ram, local, mirror, a, memory, marks, remote, promote }) => {
        memory.set(initial.id, { schema: 4, writtenAt: 1000 }) // Formato persistido anterior sem binding.
        local.rows.set(initial.id, { ...ram, updatedAt: 3000 })
        await loadSettled(mirror, local)
        let release = () => {},
          ready = () => {}
        const gate = new Promise<void>((r) => {
          release = r
        })
        const started = new Promise<void>((r) => {
          ready = r
        })
        const download = a.cloud.download
        a.cloud.download = async (...args) => {
          const snapshot = await download(...args)
          ready()
          await gate
          return snapshot
        }
        const producing = a.uploads.get(initial.id)!.produce()
        await started
        await promote()
        local.rows.set(initial.id, { ...ram, updatedAt: 3000 })
        release()
        const payload = await producing
        expect(marks.revision(initial.id)).toBe(3)
        expect(payload?.meta?.baseRevision).toBe(2)
        expect(payload?.meta?.baseRevision).not.toBe(remote.get(full.id)?.summary.revision)
      },
      { promote: false },
    ))

  test('ACK de A não retaga assinatura de B; uma nova instância C também recusa o cache4', async () =>
    upgraded(
      async ({ full, ram, local, mirror, other, a, remote, memory, marks }) => {
        await mirror.persistAsset(full)
        const queued = a.uploads.get(full.id)!
        const snapshot = await queued.produce()
        await other.persistAsset({ ...ram, updatedAt: 3000 })
        const foreign = memory.get(full.id)?.signature
        expect(foreign?.revision).toBe(2)
        remote.set(full.id, {
          json: snapshot!.json,
          summary: summaryOf(full, { revision: 3, formatVersion: 4 }),
        })
        queued.onUploaded?.({ itemId: full.id, updatedAt: 2000, revision: 3 })
        expect(memory.get(full.id)?.signature).toEqual(foreign)
        const c = createCloudMirroredPintaPersistence({
          local,
          cloud: a.cloud,
          viewerId: 'C',
          marks,
          formatMemory: memory,
        })
        try {
          await loadSettled(c, local)
          expect(await a.uploads.get(full.id)!.produce()).toBeNull()
          await tick()
          expect(local.rows.get(full.id)).toEqual(full)
        } finally {
          c.dispose?.()
        }
      },
      { sharedMemory: true, promote: false },
    ))

  test('conflito entre duas edições no mesmo formato preserva a cópia e avança a base do retry', async () =>
    upgraded(
      async ({ initial, mirror, a, local, remote }) => {
        const mine = { ...initial, updatedAt: 3000 }
        const theirs = { ...initial, updatedAt: 2000 }
        await mirror.persistAsset(mine)
        const queued = a.uploads.get(initial.id)!
        expect((await queued.produce())?.meta?.baseRevision).toBe(2)
        remote.set(initial.id, {
          json: assetToJson(theirs),
          summary: summaryOf(theirs, { revision: 3, formatVersion: 4 }),
        })
        await queued.onStale?.({ itemId: initial.id, currentRevision: 3 })
        expect((await a.uploads.get(initial.id)!.produce())?.meta?.baseRevision).toBe(3)
        expect(local.rows.get(initial.id)).toEqual(mine)
        expect([...local.rows.values()].find((item) => item.id !== initial.id)?.name).toBe(
          'vila-copia',
        )
      },
      { sharedMemory: true, promote: false },
    ))

  test('conflito com relógios iguais não autentica RAM4 contra o documento5 de outra revisão', async () =>
    upgraded(
      async ({ initial, full, mirror, a, local, remote }) => {
        const mine = { ...initial, updatedAt: 3000 }
        const theirs = { ...full, updatedAt: 3000 }
        await mirror.persistAsset(mine)
        const queued = a.uploads.get(initial.id)!
        expect((await queued.produce())?.meta?.baseRevision).toBe(2)
        remote.set(initial.id, {
          json: assetToJson(theirs),
          summary: summaryOf(theirs, { revision: 3, formatVersion: 4 }),
        })
        await queued.onStale?.({ itemId: initial.id, currentRevision: 3 })
        expect(local.rows.get(initial.id)).toEqual(theirs)
        const copy = [...local.rows.values()].find((item) => item.id !== initial.id)
        if (copy?.kind !== 'tilemap')
          throw new Error('A edição local precisa ficar numa cópia do mapa.')
        expect(copy.schema).toBe(4)
        expect(copy.name).toBe('vila-copia')
      },
      { sharedMemory: true, promote: false },
    ))

  test('quota e reinício: sem memória de formato, a revisão conhecida não autoriza subir o cache cortado', async () =>
    quotaRestart(async ({ complete, local, mirrored, uploads, requests }) => {
      await loadSettled(mirrored, local)
      const payload = await uploads.get(complete.id)?.produce()
      expect(payload).toBeNull()
      await tick()
      expect(local.rows.get(complete.id)).toEqual(complete)
      expect([...local.rows.values()].filter((a) => a.id !== complete.id)).toHaveLength(1)
      expect(requests.downloads).toBe(1)
    }))

  test('quota e reinício: editar o cache cortado antes do primeiro envio não autentica a perda', async () =>
    quotaRestart(async ({ complete, local, mirrored, uploads }) => {
      const opened = await mirrored.loadAssetById(complete.id)
      if (opened?.kind !== 'tilemap') throw new Error('Mapa esperado')
      await mirrored.persistAsset({
        ...opened,
        updatedAt: 3000,
        layers: opened.layers.map((layer) =>
          layer.kind === 'objects' || layer.kind === 'group'
            ? layer
            : { ...layer, cells: new Int16Array([0, 0]) },
        ),
      })
      expect(await uploads.get(complete.id)?.produce()).toBeNull()
      await tick()
      expect(local.rows.get(complete.id)).toEqual(complete)
      const copy = [...local.rows.values()].find((a) => a.id !== complete.id)
      expect(copy?.kind === 'tilemap' && Array.from(copy.layers[0]?.cells ?? [])).toEqual([0, 0])
    }))

  test('quota e reinício: rede falha bloqueia o envio, mas o autosave local continua e o retry preserva a edição', async () =>
    quotaRestart(async ({ complete, cut, local, mirrored, uploads, requests }) => {
      await loadSettled(mirrored, local)
      requests.offline = true
      await expect(uploads.get(complete.id)!.produce()).rejects.toThrow('offline')
      expect(requests.downloads).toBe(1)
      const edited = { ...cut, updatedAt: 3000 }
      await mirrored.persistAsset(edited)
      expect(local.rows.get(complete.id)).toEqual(edited)
      expect(requests.downloads).toBe(1) // O autosave não consulta a rede.
      requests.offline = false
      expect(await uploads.get(complete.id)!.produce()).toBeNull()
      await tick()
      expect(local.rows.get(complete.id)).toEqual(complete)
      const copy = [...local.rows.values()].find((a) => a.id !== complete.id)
      expect(copy?.name).toBe('vila-copia')
      expect(copy?.kind === 'tilemap' && copy.layers).toEqual(cut.kind === 'tilemap' && cut.layers)
      expect(requests.downloads).toBe(2)
    }))

  test('quota sem reinício: a assinatura desta instância permite retirar recursos sem download', async () =>
    quotaRestart(
      async ({ complete, cut, mirrored, uploads, requests }) => {
        await mirrored.persistAsset({ ...cut, updatedAt: 3000 })
        expect((await uploads.get(complete.id)!.produce())?.meta).toMatchObject({
          baseRevision: 2,
          formatVersion: 4,
          updatedAt: 3000,
        })
        expect(requests.downloads).toBe(0)
      },
      { cut: false, restart: false },
    ))

  test('quota e reinício: edição de base canônica 5 pode retirar recursos depois de conferir o floor', async () =>
    quotaRestart(
      async ({ complete, cut, local, mirrored, uploads, requests }) => {
        expect(await mirrored.loadAssetById(complete.id)).toEqual(complete)
        await mirrored.persistAsset({ ...cut, updatedAt: 3000 })
        expect((await uploads.get(complete.id)!.produce())?.meta).toMatchObject({ updatedAt: 3000 })
        expect(requests.downloads).toBe(1)
        await mirrored.persistAsset({ ...cut, updatedAt: 4000 })
        expect((await uploads.get(complete.id)!.produce())?.meta).toMatchObject({ updatedAt: 4000 })
        expect(requests.downloads).toBe(1)
        expect(local.rows.size).toBe(1)
      },
      { cut: false },
    ))

  test('quota e reinício: mapa legado comprovado faz uma consulta por instância, sem bloquear suas edições', async () =>
    quotaRestart(async ({ complete, cut, local, remote, mirrored, uploads, requests }) => {
      const legacyRemote = { ...cut, updatedAt: 1000 }
      remote.set(complete.id, {
        json: assetToJson(legacyRemote),
        summary: summaryOf(legacyRemote, { revision: 2, formatVersion: 3 }),
      })
      await loadSettled(mirrored, local)
      expect((await uploads.get(complete.id)!.produce())?.meta?.updatedAt).toBe(2000)
      await mirrored.persistAsset({ ...cut, updatedAt: 3000 })
      expect((await uploads.get(complete.id)!.produce())?.meta?.updatedAt).toBe(3000)
      expect(requests.downloads).toBe(1)
      expect(local.rows.size).toBe(1)
    }))

  test('quota e reinício: assinatura zero não confirmada de uma sessão anterior não prova o floor', async () =>
    quotaRestart(async ({ complete, cut, local, cloud, uploads }) => {
      const memory = createMemoryPintaFormatMemory()
      memory.set(complete.id, { schema: 0, writtenAt: 3000 })
      const marks = createMemorySyncedMarks()
      marks.set(complete.id, 1000, 2)
      local.rows.set(complete.id, { ...cut, updatedAt: 3000 })
      const reopened = createCloudMirroredPintaPersistence({
        local,
        cloud,
        viewerId: 'quota-reopened',
        marks,
        formatMemory: memory,
        now: () => 9000,
      })
      try {
        await loadSettled(reopened, local)
        expect(await uploads.get(complete.id)!.produce()).toBeNull()
        await tick()
        expect(local.rows.get(complete.id)).toEqual(complete)
        expect([...local.rows.values()].filter((a) => a.id !== complete.id)).toHaveLength(1)
      } finally {
        reopened.dispose?.()
      }
    }))

  test('corte de frações 5→4 é detectado mesmo quando a elipse mantém o carimbo completo antigo', async () => {
    const base = mapaCompleto(1000)
    if (base.kind !== 'tilemap') throw new Error('Mapa esperado')
    const complete = ler({
      ...base,
      layers: base.layers.map((layer, i) =>
        i === 0 ? { ...layer, offsetX: 16.5, offsetY: 0.25 } : layer,
      ),
    })
    const local = fakeLocal()
    const remote = new Map<string, { summary: CloudCreationSummary; json: string }>()
    const { cloud, uploads } = fakeCloud(remote)
    const memory = createMemoryPintaFormatMemory()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'precisao',
      formatMemory: memory,
      marks: createMemorySyncedMarks(),
    })
    await mirrored.persistAsset(complete)
    expect((await uploads.get(complete.id)?.produce())?.meta?.formatVersion).toBe(4)
    uploads.get(complete.id)?.onUploaded?.({ itemId: complete.id, updatedAt: 1000, revision: 1 })
    remote.set(complete.id, {
      json: assetToJson(complete),
      summary: summaryOf(complete, { formatVersion: 4, revision: 1 }),
    })
    expect(memory.get(complete.id)?.schema).toBe(5)
    const cut = ler({
      ...base,
      updatedAt: 2000,
      layers: base.layers.map((layer, i) => (i === 0 ? { ...layer, offsetX: 17 } : layer)),
    })
    expect(carimbo(cut)).toBe(4)
    local.rows.set(complete.id, cut)
    expect(await uploads.get(complete.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.get(complete.id)).toEqual(complete)
    const copy = [...local.rows.values()].find((asset) => asset.id !== complete.id)
    expect(copy?.kind === 'tilemap' && copy.layers[0]?.offsetX).toBe(17)
    expect(carimbo(copy)).toBe(4)
    expect(memory.get(complete.id)?.schema).toBe(5)
    mirrored.dispose?.()
  })

  test('a outra aba cortou e salvou: nada sobe, a versão da conta volta no mesmo id e a daqui fica como `-copia`', async () => {
    const { completo, local, uploads, marks, mirrored } = await sincronizado()
    const corte = cortado(completo, 2000, [0, 0])
    expect(carimbo(corte)).toBeUndefined()
    local.rows.set(corte.id, corte)

    // A reconciliação vê "local mudou" e enfileira a subida; o produtor é quem barra.
    await loadSettled(mirrored, local)
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()

    const voltou = local.rows.get(completo.id)
    expect(voltou).toEqual(completo)
    expect(carimbo(voltou)).toBe(4)
    expect(marks.get(completo.id)).toBe(1000)
    expect(marks.revision(completo.id)).toBe(4)
    // O que a outra aba pintou não se perde: vira um desenho novo, que sobe como novo.
    const copias = [...local.rows.values()].filter((a) => a.id !== completo.id)
    expect(copias.map((a) => a.name)).toEqual(['vila-copia'])
    const copia = copias[0]
    expect(copia?.kind === 'tilemap' && Array.from(copia.layers[0]?.cells ?? [])).toEqual([0, 0])
    expect((await uploads.get(copia?.id ?? '')?.produce())?.meta?.name).toBe('vila-copia')
    // O original já está igual à conta: uma nova tentativa não sobe nada nem cria outra cópia.
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.size).toBe(2)
  })

  test('abrir o mapa cortado e editar por cima não esconde o corte: a edição vai para a cópia', async () => {
    const { completo, local, uploads, mirrored } = await sincronizado()
    local.rows.set(completo.id, cortado(completo, 2000))
    // O editor carrega pelo embrulho (é aqui que o corte fica marcado) e salva uma edição.
    const aberto = await mirrored.loadAssetById(completo.id)
    expect(carimbo(aberto ?? undefined)).toBeUndefined()
    await mirrored.persistAsset(cortado(completo, 3000, [0, 0]))

    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.get(completo.id)).toEqual(completo)
    const copia = [...local.rows.values()].find((a) => a.id !== completo.id)
    expect(copia?.name).toBe('vila-copia')
    expect(copia?.kind === 'tilemap' && Array.from(copia.layers[0]?.cells ?? [])).toEqual([0, 0])
  })

  test('este código baixar o carimbo (a criança apagou a forma) é edição de verdade e sobe', async () => {
    const { completo, local, uploads, formatMemory, mirrored } = await sincronizado()
    const semForma = cortado(completo, 2000)
    await mirrored.persistAssets([semForma])
    const snapshot = await uploads.get(completo.id)?.produce()
    expect(snapshot?.meta?.updatedAt).toBe(2000)
    expect(snapshot?.meta?.baseRevision).toBe(4)
    uploads.get(completo.id)?.onUploaded?.({ itemId: completo.id, updatedAt: 2000, revision: 5 })
    expect(formatMemory.get(completo.id)?.schema).toBe(0)
    expect(local.rows.size).toBe(1)
    // Daqui em diante o carimbo lembrado é o novo: nada fica marcado como corte.
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.get(completo.id)).toEqual(semForma)
  })

  test('salvar de novo com o envio em voo: a confirmação do envio antigo não apaga a assinatura da gravação nova', async () => {
    const { completo, local, uploads, mirrored } = await sincronizado()
    const comForma = { ...completo, updatedAt: 2000 } as PintaAsset
    await mirrored.persistAssets([comForma])
    const emVoo = uploads.get(completo.id)
    expect((await emVoo?.produce())?.meta?.updatedAt).toBe(2000)
    // Enquanto sobe, a criança apaga a forma (carimbo cai) e salva de novo por este código.
    const semForma = cortado(completo, 3000)
    await mirrored.persistAssets([semForma])
    emVoo?.onUploaded?.({ itemId: completo.id, updatedAt: 2000, revision: 5 })
    expect((await uploads.get(completo.id)?.produce())?.meta?.updatedAt).toBe(3000)
    await tick()
    expect(local.rows.size).toBe(1)
    expect(local.rows.get(completo.id)).toEqual(semForma)
  })

  test('mapa cortado ABERTO no editor: nada sobe e nada é gravado por baixo; fechado, a conta volta', async () => {
    let aberto = true
    const { completo, local, uploads, mirrored } = await sincronizado({
      isAssetOpen: () => aberto,
    })
    const corte = cortado(completo, 2000)
    local.rows.set(completo.id, corte)
    // O editor abre o mapa pelo embrulho (o corte fica marcado) e salva por cima.
    await mirrored.loadAssetById(completo.id)
    await mirrored.persistAsset(cortado(completo, 3000))
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.size).toBe(1)
    expect(local.rows.get(completo.id)?.updatedAt).toBe(3000)

    aberto = false
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.get(completo.id)).toEqual(completo)
    expect(local.rows.size).toBe(2)
  })

  test('a conta guarda formato que este código não lê: nada sobe, nada desce, a galeria recebe o aviso', async () => {
    const { completo, local, remote, uploads, mirrored } = await sincronizado()
    const corte = cortado(completo, 2000)
    local.rows.set(completo.id, corte)
    remote.set(completo.id, {
      json: assetToJson(completo),
      summary: summaryOf(completo, { revision: 6, formatVersion: 99 }),
    })
    await mirrored.loadAssetById(completo.id)
    await mirrored.persistAsset(cortado(completo, 3000))
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.size).toBe(1)
    expect(local.rows.get(completo.id)?.updatedAt).toBe(3000)
    expect(mirrored.getReadIssues?.().map((i) => i.id)).toEqual([completo.id])
  })

  test('a conta já não tem o item: não há versão inteira para proteger e o que há aqui sobe', async () => {
    const { completo, local, remote, uploads, formatMemory, mirrored } = await sincronizado()
    remote.delete(completo.id)
    const corte = cortado(completo, 2000)
    local.rows.set(completo.id, corte)
    await mirrored.loadAssetById(completo.id)
    await mirrored.persistAsset(corte)
    // A primeira tentativa descobre que a conta não tem o item e reenfileira.
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(formatMemory.get(completo.id)).toBeUndefined()
    expect((await uploads.get(completo.id)?.produce())?.meta?.updatedAt).toBe(2000)
    expect(local.rows.size).toBe(1)
  })

  test('sem carimbo lembrado (o desenho nunca sincronizou por este código): nada é barrado', async () => {
    const completo = mapaCompleto(1000)
    const corte = cortado(completo, 2000)
    const local = fakeLocal([corte])
    const { cloud, uploads } = fakeCloud(new Map())
    let downloads = 0
    cloud.download = async () => {
      downloads++
      throw new Error('Não deve baixar um asset novo')
    }
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
      formatMemory: createMemoryPintaFormatMemory(),
    })
    await loadSettled(mirrored, local)
    expect((await uploads.get(corte.id)?.produce())?.meta?.updatedAt).toBe(2000)
    expect(downloads).toBe(0)
  })

  test('descida grava o carimbo lembrado: o corte de um mapa que só DESCEU também é barrado', async () => {
    const completo = mapaCompleto(1000)
    const local = fakeLocal()
    const { cloud, uploads } = fakeCloud(
      new Map([
        [
          completo.id,
          { json: assetToJson(completo), summary: summaryOf(completo, { revision: 2 }) },
        ],
      ]),
    )
    const formatMemory = createMemoryPintaFormatMemory()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
      formatMemory,
      reconcileMinIntervalMs: 0,
    })
    await loadSettled(mirrored, local)
    expect(local.rows.get(completo.id)).toEqual(completo)
    expect(formatMemory.get(completo.id)).toEqual({
      schema: 4,
      revision: 2,
      writtenAt: 1000,
      signature: { at: 1000, schema: 4, revision: 2, maxSchema: 5, writerId: expect.any(String) },
    })

    local.rows.set(completo.id, cortado(completo, 2000))
    await loadSettled(mirrored, local)
    expect(await uploads.get(completo.id)?.produce()).toBeNull()
    await tick()
    expect(local.rows.get(completo.id)).toEqual(completo)
  })

  test('desenho sem formato próprio (sprite) nem entra na memória de carimbos', async () => {
    const local = fakeLocal()
    const { cloud, uploads } = fakeCloud(new Map())
    const formatMemory = createMemoryPintaFormatMemory()
    const mirrored = createCloudMirroredPintaPersistence({
      local,
      cloud,
      viewerId: 'perfil-1',
      marks: createMemorySyncedMarks(),
      formatMemory,
    })
    const nave = sprite('nave', 1000)
    await mirrored.persistAssets([nave])
    await uploads.get(nave.id)?.produce()
    uploads.get(nave.id)?.onUploaded?.({ itemId: nave.id, updatedAt: 1000, revision: 1 })
    expect(formatMemory.get(nave.id)).toBeUndefined()
  })
})
