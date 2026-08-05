import { describe, expect, it } from 'bun:test'
import {
  createBitmap,
  createPixelBackgroundAsset,
  createPixelLayer,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  type PintaAsset,
} from '../core/project'
import { setCell } from '../tiles/tilemapOps'
import { galleryToPintaJson, importPintaJson } from './projectJson'

function makeGallery(): PintaAsset[] {
  const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
  const frame = sprite.animations[0]?.frames[0]
  if (frame?.[0]) frame[0].data[0] = 5
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  let tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 3, rows: 2 })
  const layerId = tilemap.layers[0]?.id
  if (layerId) tilemap = setCell(tilemap, layerId, 1, 1, 0)
  return [
    sprite,
    createPixelBackgroundAsset({ name: 'ceu', width: 16, height: 12 }),
    tileset,
    tilemap,
    createVectorBackgroundAsset({ name: 'livre', width: 480, height: 360 }),
  ]
}

describe('galleryToPintaJson / importPintaJson', () => {
  it('round-trip da galeria inteira (5 tipos)', () => {
    const gallery = makeGallery()
    const { assets, warnings } = importPintaJson(galleryToPintaJson(gallery))
    expect(warnings).toEqual([])
    expect(assets).toHaveLength(5)
    expect(assets.map((a) => a.kind).sort()).toEqual([
      'pixel-background',
      'pixel-sprite',
      'tilemap',
      'tileset',
      'vector-background',
    ])
    const sprite = assets.find((a) => a.kind === 'pixel-sprite')
    expect(sprite?.kind === 'pixel-sprite' && sprite.animations[0]?.frames[0]?.[0]?.data[0]).toBe(5)
    const tilemap = assets.find((a) => a.kind === 'tilemap')
    expect(tilemap?.kind === 'tilemap' && tilemap.layers[0]?.cells[4]).toBe(0)
  })

  it('asset corrompido é pulado COM aviso (os bons entram)', () => {
    const parsed = JSON.parse(galleryToPintaJson(makeGallery())) as {
      assets: Array<Record<string, unknown>>
    }
    const first = parsed.assets[0]
    if (first) first.kind = 'alien'
    const { assets, warnings } = importPintaJson(JSON.stringify(parsed))
    expect(assets).toHaveLength(4)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('heroi')
  })

  it('arquivo que não é do Pinta → aviso claro, zero assets', () => {
    expect(importPintaJson('{"foo": 1}').warnings[0]).toContain('backup do Pinta')
    expect(importPintaJson('não é json').warnings[0]).toContain('válido')
    expect(importPintaJson('não é json').assets).toEqual([])
  })

  it('preserva índices quando um cel ou tile intermediário está corrompido', () => {
    const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
    const spriteCels = [1, 2, 3].map((color) => {
      const cel = createBitmap(8, 8)
      cel.data[0] = color
      return cel
    })
    sprite.layers = [createPixelLayer(0), createPixelLayer(1), createPixelLayer(2)]
    const animation = sprite.animations[0]
    if (!animation) throw new Error('animação esperada')
    animation.frames = [spriteCels]

    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset.tiles = [1, 2, 3].map((color) => {
      const tile = createBitmap(16, 16)
      tile.data[0] = color
      return tile
    })
    tileset.solid = [false, false, false]
    tileset.platform = [false, false, false]
    let tilemap = createTilemapAsset({
      name: 'fase',
      tilesetId: tileset.id,
      cols: 1,
      rows: 1,
    })
    const layerId = tilemap.layers[0]?.id
    if (!layerId) throw new Error('camada esperada')
    tilemap = setCell(tilemap, layerId, 0, 0, 2)

    const document = JSON.parse(galleryToPintaJson([sprite, tileset, tilemap])) as {
      assets: Array<Record<string, unknown>>
    }
    const encodedSprite = document.assets[0] as {
      animations: Array<{ frames: Array<Array<Record<string, unknown>>> }>
    }
    const encodedTileset = document.assets[1] as { tiles: Array<Record<string, unknown>> }
    const spriteFrame = encodedSprite.animations[0]?.frames[0]
    if (!spriteFrame?.[1] || !encodedTileset.tiles[1]) throw new Error('backup esperado')
    spriteFrame[1].rle = 'corrompido'
    encodedTileset.tiles[1].rle = 'corrompido'

    const result = importPintaJson(JSON.stringify(document))
    expect(result.warnings).toEqual([])
    const restoredSprite = result.assets.find((asset) => asset.kind === 'pixel-sprite')
    const restoredTileset = result.assets.find((asset) => asset.kind === 'tileset')
    const restoredMap = result.assets.find((asset) => asset.kind === 'tilemap')
    if (restoredSprite?.kind !== 'pixel-sprite') throw new Error('sprite esperado')
    if (restoredTileset?.kind !== 'tileset') throw new Error('tileset esperado')
    if (restoredMap?.kind !== 'tilemap') throw new Error('mapa esperado')
    expect(restoredSprite.animations[0]?.frames[0]?.map((cel) => cel.data[0])).toEqual([1, 0, 3])
    expect(restoredTileset.tiles.map((tile) => tile.data[0])).toEqual([1, 0, 3])
    expect(restoredMap.layers[0]?.cells[0]).toBe(2)
  })

  it('rejeita versão futura e células que exigiriam coerção silenciosa', () => {
    const map = createTilemapAsset({ name: 'fase', tilesetId: 'pecas', cols: 1, rows: 1 })
    const future = JSON.parse(galleryToPintaJson([map])) as Record<string, unknown>
    future.version = 999
    const futureResult = importPintaJson(JSON.stringify(future))
    expect(futureResult.assets).toEqual([])
    expect(futureResult.warnings[0]).toContain('versão')

    const malformed = JSON.parse(galleryToPintaJson([map])) as {
      assets: Array<{ layers: Array<{ cells: unknown[] }> }>
    }
    const cells = malformed.assets[0]?.layers[0]?.cells
    if (!cells) throw new Error('células esperadas')
    cells[0] = null
    const malformedResult = importPintaJson(JSON.stringify(malformed))
    expect(malformedResult.assets).toEqual([])
    expect(malformedResult.warnings).toHaveLength(1)
  })
})

describe('galleryStore.importAssets (restauro)', () => {
  it('ids novos + tilemap religado ao tileset restaurado', async () => {
    const { clearIdbMock } = await import('../testing/idbMock')
    const { createGalleryStore } = await import('../state/galleryStore')
    const { setPintaStorageNamespace } = await import('../state/persistence')
    clearIdbMock()
    setPintaStorageNamespace('')

    const gallery = makeGallery()
    const { assets } = importPintaJson(galleryToPintaJson(gallery))
    const store = createGalleryStore()
    const result = await store.getState().importAssets(assets)
    expect(result.added).toBe(5)
    expect(result.skipped).toBe(0)

    const restored = store.getState().assets
    const tileset = restored.find((a) => a.kind === 'tileset')
    const tilemap = restored.find((a) => a.kind === 'tilemap')
    if (tilemap?.kind !== 'tilemap' || tileset?.kind !== 'tileset') {
      throw new Error('tileset/tilemap esperados')
    }
    // O mapa aponta pro id NOVO do tileset (não o do backup).
    expect(tilemap.tilesetId).toBe(tileset.id)
    expect(gallery.some((a) => a.id === tileset.id)).toBe(false)
  })

  it('colisão de nome ganha sufixo; restauro repetido não sobrescreve', async () => {
    const { clearIdbMock } = await import('../testing/idbMock')
    const { createGalleryStore } = await import('../state/galleryStore')
    const { setPintaStorageNamespace } = await import('../state/persistence')
    clearIdbMock()
    setPintaStorageNamespace('')

    const store = createGalleryStore()
    await store.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 8 })
    const backup = importPintaJson(
      galleryToPintaJson([createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })]),
    )
    const result = await store.getState().importAssets(backup.assets)
    expect(result.added).toBe(1)
    expect(
      store
        .getState()
        .assets.map((a) => a.name)
        .sort(),
    ).toEqual(['heroi', 'heroi-2'])
  })
})

describe('zipGallery', () => {
  it('monta o ZIP com os arquivos de TEXTO mesmo sem canvas (happy-dom)', async () => {
    const { zipGallery, buildGalleryFileMap } = await import('./zip')
    const gallery = makeGallery()
    const { files } = await buildGalleryFileMap(gallery)
    // PNGs dependem de canvas real (null no happy-dom); os textos SEMPRE saem.
    expect(Object.keys(files)).toContain('mapas/fase.grade.txt')
    expect(Object.keys(files)).toContain('mapas/fase.pinta-tilemap.json')
    // O desenho vetorial (ex-'vetores/') agora vive em cenarios/, ao lado do pixel.
    expect(Object.keys(files)).toContain('cenarios/livre.svg')
    expect(Object.keys(files)).toContain('personagens/heroi/spritesheet.json')
    expect(Object.keys(files)).toContain('galeria.pinta.json')

    const bytes = await zipGallery(gallery)
    expect(bytes.length).toBeGreaterThan(100)
    // Assinatura PK do ZIP.
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
  })
})
