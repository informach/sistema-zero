import {
  PALETTE_LIBRARY_ITEM_ID as id,
  PALETTE_LIBRARY_KIND as kind,
} from '../../src/lib/pinta-cloud-persistence'
type PL = import('../../../pinta/src/core/paletteLibrary').PaletteLibrary
const lib = (color: string, at: number): PL => ({
  version: 1,
  updatedAt: at,
  palettes: color
    ? [{ id: color, name: color, colors: ['', '#abcdef', ...Array(14).fill('')], updatedAt: at }]
    : [],
  removed: [],
})
const pack = (p: PL, rev: number) => ({
  json: JSON.stringify(p),
  summary: {
    itemId: id,
    kind,
    name: 'Minhas paletas',
    itemUpdatedAt: p.updatedAt,
    revision: rev,
    bytes: 128,
    thumb: null,
    syncedAt: p.updatedAt,
  },
  parts: [],
  fetchPart: async () => {
    throw Error('fora do teste')
  },
})
function makeCloud(download, mods = {}) {
  const temp = createTilemapAsset({ name: 'mapa', cols: 1, rows: 1, tilesetId: 'x' })
  const { cloud, queued } = fakeCloud(temp, 1)
  return { cloud: { ...cloud, download, ...mods }, queued }
}
test('o erro de download de um mapa deixa a biblioteca independente descer', async () => {
  const ns = 'biblioteca-grafo-independente',
    local = createPintaCausalPersistence({ namespace: ns })
  await local.causal.applyPull({ fromEpoch: null, epoch: '1', transitions: [] }, () => true)
  const palette = lib('ceu', 200),
    dummy = createTilesetAsset({ name: 'folha', tileSize: 8 })
  const archived = await cloudAsset(dummy, 1, '2')
  let paletteReads = 0,
    mapReads = 0
  const api = makeCloud(
    async (itemId) => {
      expect(itemId).toBe(id)
      paletteReads++
      return pack(palette, 2)
    },
    {
      list: async () => {
        throw Error('a galeria está adotada')
      },
      pintaCausal: {
        snapshot: async () => ({ epoch: '2', requiredFormat: 6, entries: [archived.entry] }),
        verifyEpoch: async () => {},
        backfill: async () => {},
        download: async () => {
          mapReads++
          throw TypeError('apenas o blob do mapa falhou')
        },
        upload: async () => {
          throw Error('sem upload')
        },
      },
    },
  )
  const wrapper = createCloudMirroredPintaPersistence({
    local,
    cloud: api.cloud,
    viewerId: ns,
    causal: { local: local.causal, holdOpen: async () => () => {}, withClosed: (_, act) => act() },
  })
  try {
    const end = Promise.withResolvers()
    const paletteReady = Promise.withResolvers()
    const off = wrapper.subscribe((e) => {
      if (e.type === 'sync-end') end.resolve()
      if (e.type === 'palette-library-changed') paletteReady.resolve()
    })
    await wrapper.listAllAssets()
    await end.promise
    expect(mapReads).toBe(1)
    expect(paletteReads).toBe(1)
    await paletteReady.promise
    off()
    expect((await local.loadPaletteLibrary()).palettes[0].id).toBe('ceu')
  } finally {
    wrapper.dispose()
  }
})
test('uma leitura já iniciada pára de escrever e publicar marcas após A→sair→B', async () => {
  const a = createPintaPersistence({ namespace: 'pessoa-a' }),
    b = createPintaPersistence({ namespace: 'pessoa-b' })
  await a.savePaletteLibrary(lib('a', 100))
  await b.savePaletteLibrary(lib('b', 100))
  const marks = createMemorySyncedMarks()
  const gate = Promise.withResolvers(),
    started = Promise.withResolvers()
  const api = makeCloud(async () => {
    started.resolve()
    await gate.promise
    return pack(lib('remota-a', 200), 2)
  })
  const w = createCloudMirroredPintaPersistence({
    local: a,
    cloud: api.cloud,
    viewerId: 'pessoa-a',
    marks,
  })
  const pending = w.syncPaletteLibrary()
  await started.promise
  w.dispose()
  const other = createCloudMirroredPintaPersistence({
    local: b,
    cloud: makeCloud(async () => null).cloud,
    viewerId: 'pessoa-b',
  })
  try {
    gate.resolve()
    await pending.catch(() => {})
    expect((await b.loadPaletteLibrary()).palettes.map((p) => p.id)).toEqual(['b'])
    expect((await a.loadPaletteLibrary()).palettes.map((p) => p.id)).toEqual(['a'])
    expect(marks.revision(id)).toBeUndefined()
    expect(api.queued).toEqual([])
  } finally {
    gate.resolve()
    other.dispose()
  }
})
test('com zero cores vivas a lápide sobe e a galeria permite reabrir depois de uma falha', async () => {
  const l = createPintaPersistence({ namespace: 'somente-lapide' })
  await l.savePaletteLibrary({ ...lib('', 100), removed: [{ id: 'apagada', removedAt: 100 }] })
  let reads = 0
  const api = makeCloud(async () => {
    reads++
    if (reads === 1) throw TypeError('sem rede')
    return null
  })
  const w = createCloudMirroredPintaPersistence({ local: l, cloud: api.cloud, viewerId: 'p' })
  try {
    await expect(w.syncPaletteLibrary()).rejects.toThrow('sem rede')
    expect(api.queued).toHaveLength(0)
    await w.syncPaletteLibrary()
    expect(api.queued).toEqual([id])
    expect((await l.loadPaletteLibrary()).removed).toEqual([{ id: 'apagada', removedAt: 100 }])
  } finally {
    w.dispose()
  }
})

test('resposta GET anterior ao conflito não retrocede a revisão já conhecida do item', async () => {
  const local = createPintaPersistence({ namespace: 'revisoes-em-ordem' })
  let onStale
  const marked = createMemorySyncedMarks()
  const started = Promise.withResolvers(),
    finish = Promise.withResolvers()
  let reads = 0
  const api = makeCloud(
    async () => {
      if (++reads === 1) {
        started.resolve()
        await finish.promise
        return pack(lib('publicada-antiga', 200), 2)
      }
      return pack(lib('publicada-nova', 300), 3)
    },
    {
      enqueueUpload: (_id, _p, _ack, stale) => {
        onStale = stale
      },
    },
  )
  const h = createCloudMirroredPintaPersistence({
    local,
    cloud: api.cloud,
    viewerId: 'p',
    marks: marked,
  })
  try {
    await h.savePaletteLibrary(lib('local', 100))
    const direct = h.syncPaletteLibrary()
    await started.promise
    const stale = onStale({ itemId: id, currentRevision: 3 })
    // A versão antiga pode chegar só depois do handler 409. A versão corrente deve prevalecer.
    await Promise.resolve()
    if (reads > 1) await stale
    finish.resolve()
    await Promise.all([direct, stale])
    expect(marked.revision(id)).toBe(3)
    expect((await local.loadPaletteLibrary()).palettes.some((p) => p.id === 'publicada-nova')).toBe(
      true,
    )
  } finally {
    finish.resolve()
    h.dispose()
  }
})

test('um recibo atrasado não retrocede a marca da paleta mais recente', async () => {
  const local = createPintaPersistence({ namespace: 'ordem-ack-paleta' })
  let onUploaded
  const marks = createMemorySyncedMarks()
  const api = makeCloud(async () => pack(lib('mais-nova', 300), 3), {
    enqueueUpload: (_id, _p, ack) => {
      onUploaded = ack
    },
  })
  const w = createCloudMirroredPintaPersistence({ local, cloud: api.cloud, viewerId: 'p', marks })
  try {
    await w.savePaletteLibrary(lib('minha', 100))
    const ack2 = onUploaded
    await w.syncPaletteLibrary()
    expect(marks.revision(id)).toBe(3)
    ack2({ itemId: id, updatedAt: 100, revision: 2 })
    expect(marks.revision(id)).toBe(3)
    expect(marks.get(id)).toBe(300)
  } finally {
    w.dispose()
  }
})
test('metadado divergente ou biblioteca vazia não cria upload fantasma', async () => {
  const local = createPintaPersistence({ namespace: 'identidade-paleta' })
  let valid = false
  const response = pack(lib('remota', 200), 2)
  const api = makeCloud(async () =>
    valid
      ? null
      : { ...response, summary: { ...response.summary, itemId: 'outro', kind: 'tileset' } },
  )
  const marks = createMemorySyncedMarks(),
    w = createCloudMirroredPintaPersistence({ local, cloud: api.cloud, viewerId: 'p', marks })
  try {
    await expect(w.syncPaletteLibrary()).rejects.toThrow()
    expect(await local.loadPaletteLibrary()).toBeNull()
    expect(marks.revision(id)).toBeUndefined()
    valid = true
    await w.syncPaletteLibrary()
    expect(api.queued).toEqual([])
  } finally {
    w.dispose()
  }
})
