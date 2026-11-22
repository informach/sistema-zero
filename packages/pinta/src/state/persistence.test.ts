import { beforeEach, describe, expect, it } from 'bun:test'
import type { PintaCausalIntent } from '@sistemazero/core/creations/pinta-causal'
import { pintaLocalRevisionOf, pintaResourceObservation } from '../core/localAssetOrigin'
import type { MapSetAsset, TilemapAsset } from '../core/project'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  withPintaSchemaStamp,
} from '../core/project'
import { galleryBackupByteLength, MAX_BACKUP_FILE_BYTES } from '../export/projectJson'
import {
  clearIdbMock,
  idbMockDb,
  idbMockStats,
  resetIdbMockStats,
  setIdbWriteGuard,
} from '../testing/idbMock'
import { MAX_IMAGE_SRC_CHARS, type VectorShape } from '../vector/model'

const {
  PintaStorageBudgetError,
  createPintaCausalPersistence,
  createPintaPersistence,
  persistAsset,
  setPintaStorageNamespace,
} = await import('./persistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('authority of the causal gallery', () => {
  it('keeps the resource revision actually observed even after the editable lineage advances', async () => {
    const local = createPintaCausalPersistence({ namespace: 'revision-observada' })
    const created = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    await local.persistAsset(created)
    const before = await local.loadAssetById(created.id)
    if (!before) throw Error('fixture')
    const observed = pintaResourceObservation(before)
    expect(observed?.localRevision).toBe(pintaLocalRevisionOf(before))
    const edited = { ...before, name: 'pecas-novas' }
    expect(pintaResourceObservation(edited)).toBeNull()
    await local.persistAsset(edited)
    expect(pintaLocalRevisionOf(before)).toBe(pintaLocalRevisionOf(edited))
    expect(pintaResourceObservation(edited)).not.toEqual(observed)
    expect(pintaResourceObservation(before)).toEqual(observed)
  })

  it('preserves an unpublished offline map when a remote sheet changes its indices', async () => {
    const local = createPintaCausalPersistence({ namespace: 'offline-remap' })
    const sheet = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    sheet.tiles.push(structuredClone(sheet.tiles[0]!))
    sheet.solid.push(false)
    sheet.platform.push(false)
    expect(
      await local.causal.applyPull(
        {
          fromEpoch: null,
          epoch: '1',
          transitions: [
            {
              id: sheet.id,
              before: null,
              beforeRevision: null,
              after: sheet,
              remote: { revision: 1, layoutRevision: '1', sha256: 'a'.repeat(64) },
            },
          ],
        },
        () => true,
      ),
    ).toBe(true)
    const map = createTilemapAsset({ name: 'novo-mapa', tilesetId: sheet.id, cols: 2, rows: 2 })
    map.layers[0]!.cells![0] = 1
    await local.persistAsset(map)
    const [base] = await local.causal.capture([sheet.id])
    if (base?.before?.kind !== 'tileset') throw Error('fixture')
    const pull = {
      fromEpoch: '1',
      epoch: '2',
      transitions: [
        {
          ...base,
          after: {
            ...base.before,
            tiles: base.before.tiles.slice(1),
            solid: base.before.solid.slice(1),
            platform: base.before.platform.slice(1),
          },
          remote: { revision: 2, layoutRevision: '2', sha256: 'b'.repeat(64) },
        },
      ],
    }
    const impact = await local.causal.pullImpact(pull)
    expect(impact).toEqual({ ids: [sheet.id, map.id], blocked: true })
    expect(await local.causal.applyPull({ ...pull, coveredIds: impact.ids }, () => true)).toBe(
      false,
    )
    expect((await local.causal.inspect()).epoch).toBe('1')
    expect(await local.loadAssetById(sheet.id)).toMatchObject({ tiles: sheet.tiles })
    expect(await local.loadAssetById(map.id)).toMatchObject({ layers: map.layers })
  })

  it('counts drawings and the sealed gzip in the same budget and keeps the draft after refusal', async () => {
    const local = createPintaCausalPersistence({ namespace: 'causal-budget' })
    const drawings = Array.from({ length: 20 }, (_, i) =>
      createPixelSpriteAsset({ name: `arte-${i}`, frameSize: 8 }),
    )
    await local.persistAssets(drawings)
    const [base] = await local.causal.capture([drawings[0]!.id])
    if (!base?.before) throw Error('fixture')
    const opId = crypto.randomUUID()
    const queue = await local.causal.stage({
      opId,
      baseEpoch: '1',
      readSet: [],
      transitions: [
        {
          ...base,
          after: { ...base.before, name: 'nova-arte' },
          baseRevision: 1,
          operation: { type: 'update' },
        },
      ],
    })
    const bytes = MAX_BACKUP_FILE_BYTES - 4_096
    const intent = {
      protocol: 1,
      opId,
      baseEpoch: '1',
      reader: 6,
      readSet: [],
      members: [
        {
          action: 'put',
          itemId: base.id,
          baseRevision: 1,
          name: 'nova-arte',
          kind: base.before.kind,
          formatVersion: 1,
          itemUpdatedAt: new Date(base.before.updatedAt).toISOString(),
          bytes,
          sha256: 'a'.repeat(64),
          operation: { type: 'update' },
        },
      ],
    } satisfies PintaCausalIntent
    expect(galleryBackupByteLength(drawings)).toBeGreaterThan(4_096)
    await expect(
      local.causal.seal(
        queue.preparation,
        intent,
        'b'.repeat(64),
        new Map([[base.id, new Blob([new Uint8Array(bytes)])]]),
      ),
    ).rejects.toBeInstanceOf(PintaStorageBudgetError)
    expect((await local.causal.prepare(opId))?.pending).toEqual(queue)
    expect(await local.causal.inFlight()).toBeNull()
    expect(await local.listAllAssets()).toHaveLength(drawings.length)
  })

  it('refuses a malformed durable epoch without discarding the disk record', async () => {
    const namespace = 'destructive-corruption'
    const local = createPintaCausalPersistence({ namespace })
    await local.causal.rememberProtocol()
    const disk = idbMockDb(`sistema-zero-pinta-${namespace}`)
    const malformed = { ...(await local.causal.inspect()), epoch: '1e4' }
    disk.set('pinta:sync:causal', malformed)
    await expect(local.causal.inspect()).rejects.toThrow('Não consegui conferir')
    expect(disk.get('pinta:sync:causal')).toEqual(malformed)
  })
})

describe('persistência por perfil', () => {
  it('uma escrita enfileirada mantém o store do perfil em que foi solicitada', async () => {
    let releaseFirst = (): void => {}
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    let writes = 0
    setIdbWriteGuard(async () => {
      writes += 1
      if (writes === 1) await firstBlocked
    })

    const first = createPixelSpriteAsset({ name: 'a', frameSize: 8 })
    const second = { ...first, name: 'a-2' }
    setPintaStorageNamespace('perfil-a')
    const firstWrite = persistAsset(first)
    const secondWrite = persistAsset(second)
    await Promise.resolve()

    setPintaStorageNamespace('perfil-b')
    releaseFirst()
    await Promise.all([firstWrite, secondWrite])
    setIdbWriteGuard(null)

    const key = `pinta:asset:${first.id}`
    expect((idbMockDb('sistema-zero-pinta-perfil-a').get(key) as { name?: string })?.name).toBe(
      'a-2',
    )
    expect(idbMockDb('sistema-zero-pinta-perfil-b').has(key)).toBe(false)
  })

  function galleryOverBudget(shapeCount: number) {
    const asset = createVectorBackgroundAsset({ name: 'galeria-grande', width: 16, height: 16 })
    const prefix = 'data:image/png;base64,'
    const src = `${prefix}${'A'.repeat(MAX_IMAGE_SRC_CHARS - prefix.length)}`
    const shapes: VectorShape[] = Array.from({ length: shapeCount }, (_, index) => ({
      id: `figura-${index}`,
      type: 'image',
      x: 0,
      y: 0,
      w: 16,
      h: 16,
      src,
      fill: 'none',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }))
    return { ...asset, shapes }
  }

  it('falha de disco não reaproveita bytes da edição recusada ao reabrir com o mesmo timestamp', async () => {
    const local = createPintaPersistence({ namespace: 'sprite-failed-cache' })
    const sprite = createPixelSpriteAsset({ name: 'sprite', frameSize: 16 })
    await local.persistAsset(sprite)
    const edited = structuredClone(sprite)
    const data = edited.animations[0]!.frames[0]![0]!.data
    for (let index = 0; index < data.length; index++) data[index] = index % 16
    setIdbWriteGuard(() => {
      throw Error('falha-cache-qa')
    })
    try {
      await expect(local.persistAsset(edited)).rejects.toThrow('falha-cache-qa')
    } finally {
      setIdbWriteGuard(null)
    }
    await local.listAllAssets()
    const large = galleryOverBudget(112),
      last = large.shapes.at(-1)
    const excess = galleryBackupByteLength([sprite, large]) - MAX_BACKUP_FILE_BYTES + 64
    if (
      last?.type !== 'image' ||
      excess <= 0 ||
      excess >= last.src.length - 'data:image/png;base64,'.length
    )
      throw Error('Fronteira inválida')
    last.src = last.src.slice(0, last.src.length - Math.ceil(excess / 4) * 4)
    expect(galleryBackupByteLength([sprite, large])).toBeLessThanOrEqual(MAX_BACKUP_FILE_BYTES)
    await expect(local.persistAsset(large)).resolves.toBeUndefined()
    expect(structuredClone(await local.loadAssetById(sprite.id))).toEqual(structuredClone(sprite))
  })

  it('recusa uma mutação que deixaria o backup da galeria acima de 32 MiB', async () => {
    const asset = galleryOverBudget(112)

    await expect(persistAsset(asset)).rejects.toBeInstanceOf(PintaStorageBudgetError)
    expect(idbMockDb('sistema-zero-pinta').has(`pinta:asset:${asset.id}`)).toBe(false)
  })

  it('galeria legada acima do teto ainda aceita uma mutação que reduz seu backup', async () => {
    const legacy = galleryOverBudget(113)
    const key = `pinta:asset:${legacy.id}`
    idbMockDb('sistema-zero-pinta').set(key, legacy)

    await expect(persistAsset({ ...legacy, shapes: legacy.shapes.slice(0, 112) })).resolves.toBe(
      undefined,
    )
    expect((idbMockDb('sistema-zero-pinta').get(key) as typeof legacy).shapes).toHaveLength(112)
  })
})

describe('autosave com centenas de desenhos (medição)', () => {
  it('500 desenhos na galeria: 50 autosaves de UM desenho não releem a galeria inteira a cada vez', async () => {
    const persistence = createPintaPersistence()
    const assets = Array.from({ length: 500 }, (_, i) =>
      createPixelSpriteAsset({ name: `heroi-${i}`, frameSize: 16 }),
    )
    await persistence.persistAssets(assets)
    // A carga da galeria (o que a criança faz antes de editar) semeia o que houver para semear.
    const loadStart = performance.now()
    const loaded = await persistence.listAllAssets()
    expect(loaded).toHaveLength(500)
    console.log(`[perf] pinta listAllAssets(500): ${(performance.now() - loadStart).toFixed(0)}ms`)

    resetIdbMockStats()
    const edited = assets[0] as (typeof assets)[number]
    const start = performance.now()
    for (let i = 0; i < 50; i += 1) {
      await persistence.persistAsset({ ...edited, updatedAt: Date.now() + i })
    }
    const elapsed = performance.now() - start
    const stats = idbMockStats()
    console.log(`[perf] pinta 50 autosaves com 500 desenhos: ${elapsed.toFixed(0)}ms`, stats)
    // O disco recebeu os 50 writes…
    expect(stats.atomic).toBe(50)
    expect(stats.atomicKeys).toBe(50)
    // …e a galeria INTEIRA não foi relida a cada autosave (o teto aqui é a régua da
    // otimização do orçamento incremental: antes, `getManyKeys` era 500 × 50 = 25.000).
    expect(stats.getManyKeys).toBeLessThanOrEqual(500)
  }, 120_000)

  it('outra ABA atualiza um desenho (mesmo id): o aviso entre abas faz o inventário esquecer o id e relê-lo na próxima gravação (o orçamento não usa bytes velhos)', async () => {
    const persistence = createPintaPersistence({ namespace: 'abas' })
    const [x, y] = [
      createPixelSpriteAsset({ name: 'x', frameSize: 16 }),
      createPixelSpriteAsset({ name: 'y', frameSize: 16 }),
    ]
    await persistence.persistAssets([x, y])
    await persistence.listAllAssets() // semeia o inventário
    // A outra aba regrava X direto no "disco" (mesmo id, outra versão) e avisa pelo canal.
    idbMockDb('sistema-zero-pinta-abas').set(`pinta:asset:${x.id}`, {
      ...x,
      updatedAt: x.updatedAt + 1,
    })
    const otherTab = new BroadcastChannel('pinta:assets:sistema-zero-pinta-abas')
    otherTab.postMessage({ ids: [x.id] })
    await new Promise((resolve) => setTimeout(resolve, 20))
    otherTab.close()
    resetIdbMockStats()
    await persistence.persistAsset({ ...y, updatedAt: y.updatedAt + 1 })
    // Releu só X; a classificação do banco lê chaves, não os outros desenhos.
    expect(idbMockStats().getManyKeys).toBe(1)
  })
})

describe('carimbo `schema` na gravação (o que faz outro código recusar em vez de cortar)', () => {
  it('frações são gravadas e reabertas com schema 5 no mapa e no conjunto externo', async () => {
    const { createTilemapAsset } = await import('../core/project')
    const mapa = createTilemapAsset({ name: 'fracao', tilesetId: 'pecas', cols: 2, rows: 2 })
    mapa.layers[0]!.offsetX = 0.25
    const conjunto: MapSetAsset = {
      id: 'conjunto',
      kind: 'map-set',
      name: 'conjunto',
      createdAt: 1,
      updatedAt: 1,
      schema: 4,
      map: mapa,
    }
    await persistAsset(mapa)
    await persistAsset(conjunto)
    const rawMap = idbMockDb('sistema-zero-pinta').get(`pinta:asset:${mapa.id}`) as TilemapAsset
    const rawSet = idbMockDb('sistema-zero-pinta').get('pinta:asset:conjunto') as MapSetAsset
    expect(rawMap.schema).toBe(5)
    expect(rawMap.layers[0]?.offsetX).toBe(0.25)
    expect(rawSet.schema).toBe(5)
    expect(rawSet.map.schema).toBe(5)
    expect(structuredClone(await createPintaPersistence().loadAssetById(conjunto.id))).toEqual(
      rawSet,
    )
  })
  it('🚨 o registro NO DISCO leva o carimbo do conteúdo, mesmo que o desenho em memória não leve', async () => {
    const { createTilemapAsset, createTilesetAsset, isObjectLayer } = await import(
      '../core/project'
    )
    const { addMapObject, createMapObject } = await import('../tiles/mapObjects')
    const { addObjectLayer, addLayer } = await import('../tiles/tilemapOps')
    const { updateMapLayer } = await import('../tiles/layerTree')
    const disco = () => idbMockDb('sistema-zero-pinta')
    const noDisco = (id: string) => disco().get(`pinta:asset:${id}`) as { schema?: number }

    // O editor acrescenta um objeto com forma: em memória o mapa continua sem carimbo.
    let mapa = addObjectLayer(
      createTilemapAsset({ name: 'vila', tilesetId: 'pecas', cols: 2, rows: 2 }),
      'Coisas',
    )
    const layerId = mapa.layers.find(isObjectLayer)?.id ?? ''
    const semForma = mapa
    mapa = addMapObject(
      mapa,
      layerId,
      createMapObject({ name: 'lago', x: 0, y: 0, width: 16, height: 16, shape: 'ellipse' }),
    )
    expect(mapa.schema).toBeUndefined()
    await persistAsset(mapa)
    expect(noDisco(mapa.id).schema).toBe(4)

    // Só recurso de camada: 3.
    const soCamada = updateMapLayer(addLayer(semForma, 'Fundo'), semForma.layers[0]?.id ?? '', {
      opacity: 0.5,
    })
    await persistAsset(soCamada)
    expect(noDisco(mapa.id).schema).toBe(3)

    // Voltou a caber no formato antigo: o carimbo SAI do disco, e o registro é o de sempre.
    await persistAsset({ ...semForma, schema: 4 })
    expect('schema' in noDisco(mapa.id)).toBe(false)

    // Peças: carimbo velho de outro código (3 com animação) é corrigido para 4.
    const pecas = {
      ...createTilesetAsset({ name: 'pecas', tileSize: 16 }),
      schema: 3,
      animations: { '0': [{ tile: 0, duration: 100 }] },
    }
    await persistAsset(pecas)
    expect(noDisco(pecas.id).schema).toBe(4)
  })

  it('carimbar não copia um desenho correto; o clone do IndexedDB conserva seus dados', async () => {
    const sprite = createPixelSpriteAsset({ name: 'a', frameSize: 8 })
    expect(withPintaSchemaStamp(sprite)).toBe(sprite)
    await persistAsset(sprite)
    expect(
      structuredClone(idbMockDb('sistema-zero-pinta').get(`pinta:asset:${sprite.id}`)),
    ).toEqual(structuredClone(sprite))
  })
})
