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
import {
  buildStudioPayload,
  spriteMetaFromPack,
  tilemapMetaFrom,
  tilesetMetaFrom,
} from './studioBridge'

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

  it('tilesetMetaFrom emite platform SÓ quando há plataforma (retrocompat: omitido quando vazio)', () => {
    // sem plataforma → chave AUSENTE (payload byte-idêntico ao de antes)
    expect(tilesetMetaFrom(16, [true, false], [false, false])).toEqual({
      tileSize: 16,
      solid: [0],
    })
    // com plataforma → chave presente
    expect(tilesetMetaFrom(16, [true, false, false], [false, true, false])).toEqual({
      tileSize: 16,
      solid: [0],
      platform: [1],
    })
  })

  it('tilemapMetaFrom filtra a grade por camada (fundo × frente) e SEM predicado achata tudo', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    // camada de fundo com célula 1; camada da frente (marcada) com célula 2.
    const bg = tilemap.layers[0]
    if (!bg) throw new Error('camada esperada')
    bg.cells.set([1, -1])
    const frontLayer = {
      id: 'front',
      name: 'copa',
      visible: true,
      front: true,
      cells: new Int16Array([-1, 2]),
    }
    const withFront = { ...tilemap, layers: [bg, frontLayer] }
    const sheet = { dataUrl: 'data:image/png;base64,AAAA', width: 16, height: 16 }
    const bgMeta = tilemapMetaFrom(withFront, tileset, sheet, (l) => l.front !== true)
    const frontMeta = tilemapMetaFrom(withFront, tileset, sheet, (l) => l.front === true)
    expect(bgMeta.grid).toBe('1 .')
    expect(frontMeta.grid).toBe('. 2')
    // SEM predicado = mapa COMPLETO: é o que a ponte "Usar no Estúdio" grava em
    // "Meus desenhos" — a decoração da frente (peça 2) NÃO pode sumir da grade.
    const fullMeta = tilemapMetaFrom(withFront, tileset, sheet)
    expect(fullMeta.grid).toBe('1 2')
  })

  it('tilemapMetaFrom leva platform quando o tileset tem peça plataforma', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset.tiles.push({ ...tileset.tiles[0] } as (typeof tileset.tiles)[number])
    tileset.solid.push(false)
    tileset.platform.push(false)
    tileset.solid[0] = true
    tileset.platform[1] = true
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 1 })
    const sheet = { dataUrl: 'data:image/png;base64,AAAA', width: 32, height: 16 }
    const meta = tilemapMetaFrom(tilemap, tileset, sheet)
    expect(meta.solid).toEqual([0])
    expect(meta.platform).toEqual([1])
  })

  it('tilemapMetaFrom junta grade (formato do Estúdio) + sólidos + folha embutida', () => {
    const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    tileset.solid[1] = true
    const tilemap = createTilemapAsset({ name: 'fase', tilesetId: tileset.id, cols: 2, rows: 2 })
    const layer = tilemap.layers[0]
    if (!layer) throw new Error('tilemap sem camada')
    layer.cells.set([0, 1, -1, 1])
    const sheet = { dataUrl: 'data:image/png;base64,AAAA', width: 32, height: 16 }
    const meta = tilemapMetaFrom(tilemap, tileset, sheet)
    expect(meta).toEqual({
      tileSize: 16,
      cols: 2,
      rows: 2,
      grid: '0 1;. 1',
      solid: [1],
      tileset: sheet,
    })
  })

  it('tilemapMetaFrom é genérico sobre o ESTILO do tileset (vetorial idem)', () => {
    const tileset = createVectorTilesetAsset({ name: 'pecas-v', tileSize: 16 })
    tileset.solid[0] = true
    const tilemap = createTilemapAsset({ name: 'fase-v', tilesetId: tileset.id, cols: 2, rows: 1 })
    const layer = tilemap.layers[0]
    if (!layer) throw new Error('tilemap sem camada')
    layer.cells.set([0, -1])
    const sheet = { dataUrl: 'data:image/png;base64,BBBB', width: 16, height: 16 }
    const meta = tilemapMetaFrom(tilemap, tileset, sheet)
    expect(meta.grid).toBe('0 .')
    expect(meta.solid).toEqual([0])
    expect(meta.tileset).toBe(sheet)
  })
})
