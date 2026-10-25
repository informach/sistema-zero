import { beforeEach, describe, expect, it } from 'bun:test'
import {
  createBitmap,
  createPixelBackgroundAsset,
  createPixelLayer,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorTilesetAsset,
} from '../core/project'
import { clearIdbMock, idbMockStats, resetIdbMockStats, setIdbReadGuard } from '../testing/idbMock'
import { makeEllipse, makeRect } from '../vector/shapes'
import type { StudioPayload } from './studioBridge'
import { validateStudioPayloadSize } from './studioBridge'

const { persistAsset, persistAssets, setPintaStorageNamespace } = await import(
  '../state/persistence'
)
const {
  exportAssetForStudio,
  exportLoadedAssetForStudio,
  listGalleryForStudio,
  NEEDS_TILESET_MESSAGE,
} = await import('./studioLibrary')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

function redRect() {
  return makeRect({ x: 1, y: 1 }, { x: 9, y: 9 }, { fill: '#ff0000', stroke: null, opacity: 1 })
}

describe('listGalleryForStudio', () => {
  it('pixel backgrounds report canonical cel dimensions even when the first layer is hidden', async () => {
    const background = createPixelBackgroundAsset({ name: 'ceu-pixel', width: 30, height: 12 })
    background.layers[0]!.visible = false
    background.layers.push(createPixelLayer(1))
    background.cels.push(createBitmap(30, 12))
    await persistAsset(background)
    const legacy = await listGalleryForStudio()
    expect(legacy).toHaveLength(1)
    expect(Object.hasOwn(legacy[0]!, 'imageSelection')).toBe(false)
    const selected = await listGalleryForStudio({ includeImageSelection: true })
    expect(selected[0]?.imageSelection).toEqual({
      kind: 'background',
      width: 30,
      height: 12,
    })
    const { imageSelection: _selection, ...summary } = selected[0]!
    expect(summary).toEqual(legacy[0]!)
  })

  it('only exposes lightweight positional image choices when explicitly requested', async () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const animation = sprite.animations[0]!
    animation.frames.push(structuredClone(animation.frames[0]!))
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    const map = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 3, rows: 2 })
    const missing = createTilemapAsset({
      name: 'sem-pecas',
      tilesetId: 'missing',
      cols: 1,
      rows: 1,
    })
    const background = createVectorBackgroundAsset({ name: 'ceu', width: 30, height: 20 })
    // A word in the drawing: it is still vector, but it cannot become a turtle shape.
    const placa = createVectorBackgroundAsset({ name: 'placa', width: 30, height: 20 })
    placa.shapes.push({
      id: 'palavra',
      type: 'text',
      x: 2,
      y: 12,
      text: 'oi',
      fontSize: 10,
      fill: '#000000',
      stroke: null,
      opacity: 1,
      rotation: 0,
    })
    await persistAssets([sprite, tileset, map, missing, background, placa])
    expect((await listGalleryForStudio()).every((item) => !('imageSelection' in item))).toBe(true)
    const summaries = await listGalleryForStudio({ includeImageSelection: true })
    const choices = new Map(summaries.map((item) => [item.id, item.imageSelection]))
    expect(choices.get(sprite.id)).toEqual({
      kind: 'frame',
      width: 8,
      height: 8,
      animations: [{ id: animation.id, name: animation.name, frameCount: 2 }],
    })
    // Vector drawings (and maps over vector tiles) advertise their portable SVG path.
    expect(choices.get(tileset.id)).toEqual({
      kind: 'tile',
      width: 16,
      height: 16,
      tileCount: 1,
      vector: true,
      turtleShape: true,
    })
    expect(choices.get(map.id)).toEqual({ kind: 'tilemap', width: 48, height: 32, vector: true })
    expect(choices.get(missing.id)).toEqual({ kind: 'unavailable', reason: 'needs-tileset' })
    expect(choices.get(background.id)).toEqual({
      kind: 'background',
      width: 30,
      height: 20,
      vector: true,
      turtleShape: true,
    })
    expect(choices.get(placa.id)).toEqual({
      kind: 'background',
      width: 30,
      height: 20,
      vector: true,
    })
    expect(JSON.stringify([...choices.values()])).not.toContain('dataUrl')
    expect(JSON.stringify([...choices.values()])).not.toContain('shapes')
  })

  it('resume todos os desenhos com papel/estilo e ordena por mais recente', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 })
    sprite.updatedAt = 3000
    tileset.updatedAt = 2000
    tilemap.updatedAt = 1000
    await persistAssets([tileset, sprite, tilemap])

    const list = await listGalleryForStudio()
    expect(list.map((s) => s.name)).toEqual(['heroi', 'pecas', 'fase'])
    expect(list[0]).toMatchObject({ role: 'sprite', style: 'pixel' })
    expect(list[1]).toMatchObject({ role: 'tileset', style: 'pixel' })
    // tilemap é papel dos DOIS estilos → style null.
    expect(list[2]).toMatchObject({ role: 'tilemap', style: null })
  })

  it('leva o nome do jogo do Pensa (projectRef) quando o desenho é de um jogo', async () => {
    const doJogo = createPixelSpriteAsset({ name: 'vinculado', frameSize: 8 })
    doJogo.projectRef = { id: 'jogo-1', name: 'meu-jogo' }
    const avulso = createPixelSpriteAsset({ name: 'avulso', frameSize: 8 })
    await persistAssets([doJogo, avulso])

    const list = await listGalleryForStudio()
    expect(list.find((s) => s.name === 'vinculado')?.projectName).toBe('meu-jogo')
    expect(list.find((s) => s.name === 'avulso')?.projectName).toBeUndefined()
  })

  it('miniatura vetorial sai como SVG dataUrl (sem canvas); raster vira null no happy-dom', async () => {
    const vetor = createVectorBackgroundAsset({ name: 'ceu', width: 20, height: 10 })
    vetor.shapes.push(redRect())
    const pixel = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const vTileset = createVectorTilesetAsset({ name: 'pecas-v', tileSize: 16 })
    const vMapa = createTilemapAsset({
      name: 'fase-v',
      tilesetId: vTileset.id,
      cols: 2,
      rows: 1,
    })
    await persistAssets([vetor, pixel, vTileset, vMapa])

    const list = await listGalleryForStudio()
    const byName = new Map(list.map((s) => [s.name, s]))
    expect(byName.get('ceu')?.thumbDataUrl).toStartWith('data:image/svg+xml')
    expect(byName.get('ceu')?.thumbDataUrl).toContain(encodeURIComponent('#ff0000'))
    // Mapa de tileset VETORIAL também rende thumb por string (symbol/use).
    expect(byName.get('fase-v')?.thumbDataUrl).toStartWith('data:image/svg+xml')
    // Caminhos de canvas devolvem null gracioso no happy-dom (a UI usa o emoji);
    // a miniatura raster real é QA de browser (contrato pngOrNull existente).
    expect(byName.get('heroi')?.thumbDataUrl).toBeNull()
  })

  it('a miniatura enviada ao Studio conserva a máscara geométrica', async () => {
    const vetor = createVectorBackgroundAsset({ name: 'nave', width: 32, height: 32 })
    const source = makeEllipse(
      { x: 8, y: 8 },
      { x: 24, y: 24 },
      { fill: '#ffffff', stroke: null, opacity: 1 },
    )
    vetor.shapes = [{ ...redRect(), maskId: source.id }, source]
    await persistAsset(vetor)

    const thumb = (await listGalleryForStudio())[0]?.thumbDataUrl ?? ''
    expect(thumb).toContain(encodeURIComponent(`pin-mask-${source.id}`))
    expect(thumb).toContain(encodeURIComponent(`clip-path="url(#pin-mask-${source.id})"`))
  })

  it('cacheia a miniatura por updatedAt (mesmo carimbo = mesma thumb, novo = recomputa)', async () => {
    const vetor = createVectorBackgroundAsset({ name: 'ceu', width: 20, height: 10 })
    vetor.shapes.push(redRect())
    vetor.updatedAt = 1000
    await persistAsset(vetor)
    const first = (await listGalleryForStudio())[0]?.thumbDataUrl
    expect(first).toContain(encodeURIComponent('#ff0000'))

    // Mesma updatedAt com conteúdo trocado → cache segura a thumb antiga.
    const azul = {
      ...vetor,
      shapes: [
        makeRect({ x: 0, y: 0 }, { x: 5, y: 5 }, { fill: '#0000ff', stroke: null, opacity: 1 }),
      ],
    }
    await persistAsset(azul)
    expect((await listGalleryForStudio())[0]?.thumbDataUrl).toBe(first ?? '')

    // Carimbo novo → recomputa.
    await persistAsset({ ...azul, updatedAt: 2000 })
    const second = (await listGalleryForStudio())[0]?.thumbDataUrl
    expect(second).toContain(encodeURIComponent('#0000ff'))
  })

  it('respeita o namespace do perfil (host DEVE setar antes)', async () => {
    setPintaStorageNamespace('perfil-a')
    await persistAsset(createPixelSpriteAsset({ name: 'heroi', frameSize: 8 }))
    expect((await listGalleryForStudio()).length).toBe(1)
    setPintaStorageNamespace('perfil-b')
    expect(await listGalleryForStudio()).toEqual([])
  })

  it('não reaproveita miniatura de outro perfil com o mesmo id e updatedAt', async () => {
    const base = createVectorBackgroundAsset({ name: 'mesmo-id', width: 20, height: 10 })
    const red = { ...base, id: 'compartilhado', updatedAt: 1000, shapes: [redRect()] }
    setPintaStorageNamespace('perfil-a')
    await persistAsset(red)
    expect((await listGalleryForStudio())[0]?.thumbDataUrl).toContain(encodeURIComponent('#ff0000'))

    const blue = {
      ...red,
      shapes: [
        makeRect({ x: 1, y: 1 }, { x: 9, y: 9 }, { fill: '#0000ff', stroke: null, opacity: 1 }),
      ],
    }
    setPintaStorageNamespace('perfil-b')
    await persistAsset(blue)

    expect((await listGalleryForStudio())[0]?.thumbDataUrl).toContain(encodeURIComponent('#0000ff'))
  })
})

describe('exportAssetForStudio', () => {
  it('keeps a map and its tileset in the captured profile across an intervening profile change', async () => {
    const tileset = createVectorTilesetAsset({ name: 'pecas-a', tileSize: 16 })
    const map = createTilemapAsset({ name: 'mapa-a', tilesetId: tileset.id, cols: 1, rows: 1 })
    setPintaStorageNamespace('profile-a')
    await persistAssets([tileset, map])
    setPintaStorageNamespace('profile-b')
    await persistAssets([
      { ...tileset, name: 'pecas-b' },
      { ...map, name: 'mapa-b' },
    ])
    setPintaStorageNamespace('profile-a')
    const databases: string[] = []
    setIdbReadGuard((_key, database) => {
      databases.push(database)
      if (databases.length === 1) setPintaStorageNamespace('profile-b')
    })
    await exportAssetForStudio(map.id)
    expect(databases).toEqual(['sistema-zero-pinta-profile-a', 'sistema-zero-pinta-profile-a'])
  })

  it('uses an explicit namespace for listing/export without changing the active profile', async () => {
    const vector = createVectorBackgroundAsset({ name: 'fonte-a', width: 8, height: 8 })
    setPintaStorageNamespace('profile-a')
    await persistAsset(vector)
    setPintaStorageNamespace('profile-b')
    expect(
      (await listGalleryForStudio({ namespace: 'profile-a' })).map((item) => item.name),
    ).toEqual(['fonte-a'])
    const exported = await exportAssetForStudio(vector.id, { namespace: 'profile-a' })
    expect(exported.ok).toBe(true)
    expect(await listGalleryForStudio()).toEqual([])
  })

  it('does not read the linked tileset after cancellation of the captured source read', async () => {
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    const map = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 1, rows: 1 })
    await persistAssets([tileset, map])
    const entered = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>()
    const controller = new AbortController()
    const reads: IDBValidKey[] = []
    setIdbReadGuard(async (key) => {
      reads.push(key)
      entered.resolve()
      await release.promise
    })
    const pending = exportAssetForStudio(map.id, { signal: controller.signal }).then(
      () => null,
      (error: unknown) => error,
    )
    await entered.promise
    controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(reads).toEqual([`pinta:asset:${map.id}`])
  })

  it('desenho apagado → not-found', async () => {
    expect(await exportAssetForStudio('nao-existe')).toEqual({ ok: false, reason: 'not-found' })
  })

  it('sem canvas, pixel falha e vetor segue em SVG', async () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const vetor = createVectorBackgroundAsset({ name: 'ceu', width: 20, height: 10 })
    await persistAssets([sprite, vetor])
    expect(await exportAssetForStudio(sprite.id)).toEqual({ ok: false, reason: 'raster-failed' })
    const exported = await exportAssetForStudio(vetor.id)
    expect(exported.ok).toBe(true)
    if (exported.ok) expect(exported.asset.dataUrl).toStartWith('data:image/svg+xml')
  })

  it('tilemap órfão (tileset apagado) → raster-failed', async () => {
    const mapa = createTilemapAsset({ name: 'fase', tilesetId: 'sumiu', cols: 2, rows: 2 })
    await persistAsset(mapa)
    expect(await exportAssetForStudio(mapa.id)).toEqual({ ok: false, reason: 'raster-failed' })
  })
})

// "Trazer da equipe" (14/10/2026): o desenho é da COLEGA e chega como `.pinta.json`, sem nunca
// passar pela galeria deste perfil. O export tem que ser o MESMO, sem ler o IndexedDB.
describe('exportLoadedAssetForStudio', () => {
  it('exporta um desenho que NÃO está na galeria, sem tocar o IndexedDB', async () => {
    const vetor = createVectorBackgroundAsset({ name: 'ceu-da-bia', width: 20, height: 10 })
    vetor.shapes.push(redRect())
    resetIdbMockStats()
    const exported = await exportLoadedAssetForStudio(vetor)
    expect(exported.ok).toBe(true)
    if (exported.ok) {
      expect(exported.asset.id).toBe(vetor.id)
      expect(exported.asset.name).toBe('ceu-da-bia')
      expect(exported.asset.dataUrl).toStartWith('data:image/svg+xml')
      expect(exported.asset.width).toBe(20)
    }
    // Nenhuma leitura nem gravação: a galeria deste perfil não tem nada a ver com o desenho.
    expect(idbMockStats()).toEqual({
      get: 0,
      getMany: 0,
      getManyKeys: 0,
      set: 0,
      setMany: 0,
      keys: 0,
      del: 0,
    })
  })

  it('o payload é o MESMO do caminho pela galeria (exportAssetForStudio)', async () => {
    const vetor = createVectorBackgroundAsset({ name: 'mesmo', width: 20, height: 10 })
    vetor.shapes.push(redRect())
    await persistAssets([vetor])
    expect(await exportLoadedAssetForStudio(vetor)).toEqual(await exportAssetForStudio(vetor.id))
  })

  it('mapa de peças sem o conjunto → needs-tileset com a frase (mesmo com as peças na galeria)', async () => {
    const pecas = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const mapa = createTilemapAsset({ name: 'fase', tilesetId: pecas.id, cols: 2, rows: 2 })
    // As peças até existem AQUI, mas um documento só não as traz: a função não pode ir
    // buscá-las na galeria deste perfil (seria um desenho de outra pessoa com o mesmo id).
    await persistAssets([pecas])
    const result = await exportLoadedAssetForStudio(mapa)
    expect(result).toEqual({ ok: false, reason: 'needs-tileset', message: NEEDS_TILESET_MESSAGE })
    expect(NEEDS_TILESET_MESSAGE).toContain('conjunto de peças')
  })

  it('pixel sem canvas falha como o caminho da galeria (raster-failed)', async () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    expect(await exportLoadedAssetForStudio(sprite)).toEqual({
      ok: false,
      reason: 'raster-failed',
    })
  })
})

// Os tetos (o caminho ok:true do export precisa de canvas → QA de browser; a
// validação de tamanho é pura e testável aqui).
describe('validateStudioPayloadSize', () => {
  const sheet = { dataUrl: 'data:image/png;base64,AA', width: 16, height: 16 }
  const tilemapMeta = { tileSize: 16, cols: 1, rows: 1, grid: '0', solid: [], tileset: sheet }

  it('payload pequeno passa', () => {
    const payload: StudioPayload = { dataUrl: 'data:image/png;base64,AA', width: 8, height: 8 }
    expect(validateStudioPayloadSize(payload)).toBe('ok')
    expect(validateStudioPayloadSize({ ...payload, tilemap: tilemapMeta })).toBe('ok')
  })

  it('dataUrl acima de 800k → asset-too-big', () => {
    const payload: StudioPayload = { dataUrl: 'x'.repeat(800_001), width: 8, height: 8 }
    expect(validateStudioPayloadSize(payload)).toBe('asset-too-big')
  })

  it('folha do mapa acima de 180k → sheet-too-big (tilemap e tilemapFront)', () => {
    const bigSheet = { ...sheet, dataUrl: 'x'.repeat(180_001) }
    const small: StudioPayload = { dataUrl: 'data:image/png;base64,AA', width: 8, height: 8 }
    expect(
      validateStudioPayloadSize({ ...small, tilemap: { ...tilemapMeta, tileset: bigSheet } }),
    ).toBe('sheet-too-big')
    expect(
      validateStudioPayloadSize({
        ...small,
        tilemap: tilemapMeta,
        tilemapFront: { ...tilemapMeta, tileset: bigSheet },
      }),
    ).toBe('sheet-too-big')
  })
})
