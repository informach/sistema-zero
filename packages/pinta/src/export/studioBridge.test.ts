import { describe, expect, it } from 'bun:test'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type PintaAsset,
} from '../core/project'
import { packSpritesheet } from './spritesheet'
import { buildStudioPayload, spriteMetaFromPack, tilesetMetaFrom } from './studioBridge'

const REF = { animationId: null, frameIndex: 0 }

function findIn(assets: PintaAsset[]): (id: string) => PintaAsset | null {
  return (id) => assets.find((a) => a.id === id) ?? null
}

describe('buildStudioPayload (happy-dom: raster devolve null gracioso)', () => {
  // Sem canvas 2D, TODO ramo devolve null sem lançar nem pendurar — o
  // chamador mostra o toast gentil. (O conteúdo real é QA de browser.)
  it('todos os kinds devolvem null sem canvas, sem lançar', async () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const vTileset = createVectorTilesetAsset({ name: 'pecas-v', tileSize: 16 })
    const assets: PintaAsset[] = [
      createPixelSpriteAsset({ name: 'heroi', frameSize: 8 }),
      tileset,
      vTileset,
      createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 }),
      createTilemapAsset({ name: 'fase-v', tilesetId: vTileset.id, cols: 2, rows: 2 }),
      createVectorBackgroundAsset({ name: 'livre', width: 100, height: 80 }),
      createVectorSpriteAsset({ name: 'heroi-v', frameSize: 64 }),
    ]
    for (const asset of assets) {
      const payload = await buildStudioPayload(asset, findIn(assets), REF)
      expect(payload).toBeNull()
    }
  })

  it('tilemap sem tileset (apagado) devolve null', async () => {
    const tilemap = createTilemapAsset({ name: 'orfao', tilesetId: 'sumiu', cols: 2, rows: 2 })
    expect(await buildStudioPayload(tilemap, () => null, REF)).toBeNull()
  })

  it('tilemap apontando para um asset que NÃO é tileset devolve null', async () => {
    const impostor = createPixelSpriteAsset({ name: 'impostor', frameSize: 8 })
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: impostor.id, cols: 2, rows: 2 })
    expect(await buildStudioPayload(tilemap, findIn([impostor, tilemap]), REF)).toBeNull()
  })
})

// Os metadados (que atravessam a ponte junto do PNG) saem de helpers PUROS —
// testáveis sem canvas: é o que o Estúdio usa para o seletor de animação/tiles.
describe('metadados da ponte (puros, sem raster)', () => {
  it('spriteMetaFromPack traz frameW/H + os índices from/to das animações', () => {
    const asset = createPixelSpriteAsset({ name: 'heroi', frameSize: 16 })
    const meta = spriteMetaFromPack(packSpritesheet(asset))
    expect(meta.frameW).toBe(16)
    expect(meta.frameH).toBe(16)
    expect(meta.animations.length).toBeGreaterThan(0)
    // 1ª animação começa no quadro 0 (row-major na folha inteira).
    expect(meta.animations[0]?.from).toBe(0)
    expect(meta.animations[0]?.to).toBeGreaterThanOrEqual(0)
    expect(typeof meta.animations[0]?.name).toBe('string')
  })

  it('tilesetMetaFrom mapeia boolean[] paralelo → lista de índices sólidos', () => {
    expect(tilesetMetaFrom(16, [false, true, false, true])).toEqual({ tileSize: 16, solid: [1, 3] })
    expect(tilesetMetaFrom(8, [])).toEqual({ tileSize: 8, solid: [] })
  })
})
