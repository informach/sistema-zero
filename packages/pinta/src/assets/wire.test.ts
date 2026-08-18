import { describe, expect, test } from 'bun:test'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type PintaAsset,
} from '../core/project'
import { setCell } from '../tiles/tilemapOps'
import { pintaAssetFromWire, pintaAssetToWire } from './index'

function fixtures(): PintaAsset[] {
  const sprite = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
  const spriteCel = sprite.animations[0]?.frames[0]?.[0]
  if (spriteCel) spriteCel.data[0] = 5
  // Cadeado da camada: `locked: true` tem que atravessar o wire intacto.
  const spriteLayer = sprite.layers[0]
  if (spriteLayer) spriteLayer.locked = true

  const background = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 6 })
  if (background.cels[0]) background.cels[0].data[3] = 7

  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  if (tileset.tiles[0]) tileset.tiles[0].data[1] = 4

  let tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 3, rows: 2 })
  const layerId = tilemap.layers[0]?.id
  if (layerId) tilemap = setCell(tilemap, layerId, 1, 1, 0)

  // Forma vetorial TRANCADA: o cadeado também atravessa o wire.
  const livre = createVectorBackgroundAsset({ name: 'livre', width: 480, height: 360 })
  livre.shapes.push({
    id: 'shape-trancada',
    type: 'rect',
    x: 1,
    y: 2,
    w: 30,
    h: 20,
    rx: 0,
    fill: '#78dc52',
    stroke: null,
    opacity: 1,
    rotation: 0,
    locked: true,
  })

  return [
    sprite,
    background,
    tileset,
    tilemap,
    createVectorSpriteAsset({ name: 'nave', frameSize: 64 }),
    livre,
    createVectorTilesetAsset({ name: 'pecas-vetor', tileSize: 16 }),
  ]
}

describe('wire JSON do asset Pinta', () => {
  test('todos os tipos atravessam JSON e voltam saneados sem perder conteúdo', () => {
    for (const original of fixtures()) {
      const wire = pintaAssetToWire(original)
      const afterHttp = JSON.parse(JSON.stringify(wire))
      expect(pintaAssetFromWire(afterHttp), original.kind).toEqual(original)
    }
  })

  test('typed arrays viram arrays JSON, não objetos com chaves numéricas', () => {
    const background = createPixelBackgroundAsset({ name: 'ceu', width: 8, height: 6 })
    const wire = pintaAssetToWire(background) as {
      cels?: Array<{ data?: unknown }>
    }
    expect(Array.isArray(wire.cels?.[0]?.data)).toBe(true)
  })
})
