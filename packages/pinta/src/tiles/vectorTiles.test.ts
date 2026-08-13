import { describe, expect, it } from 'bun:test'
import {
  createTilemapAsset,
  createVectorTilesetAsset,
  type TilemapAsset,
  type VectorTilesetAsset,
} from '../core/project'
import { tilemapToStudioGrid, tilesetSolidList } from '../export/studioGrid'
import type { VectorShape } from '../vector/model'
import {
  packVectorTileset,
  vectorTilesetPngDataUrl,
  vectorTilesetPortableSvg,
  vectorTilesetSvg,
} from './packVectorTileset'
import {
  vectorTilemapPngDataUrl,
  vectorTilemapPortableSvg,
  vectorTilemapSvg,
} from './renderVectorTilemap'

function rect(id: string): VectorShape {
  return {
    id,
    type: 'rect',
    x: 0,
    y: 0,
    w: 16,
    h: 16,
    rx: 0,
    fill: '#91463d',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }
}

function makeTileset(count: number): VectorTilesetAsset {
  const base = createVectorTilesetAsset({ name: 'pecas-v', tileSize: 16 })
  return {
    ...base,
    tiles: Array.from({ length: count }, (_, i) => [rect(`t${i}`)]),
    solid: Array.from({ length: count }, (_, i) => i === 1),
  }
}

function makeTilemap(tilesetId: string): TilemapAsset {
  const tilemap = createTilemapAsset({ name: 'fase-v', tilesetId, cols: 3, rows: 2 })
  const layer = tilemap.layers[0]
  if (!layer) throw new Error('camada esperada')
  // [0 1 .; . 1 0]
  layer.cells.set([0, 1, -1, -1, 1, 0])
  return tilemap
}

describe('packVectorTileset — a MESMA fórmula do pixel', () => {
  it('columns = min(count, 8), row-major', () => {
    const pack = packVectorTileset(makeTileset(10))
    expect(pack.columns).toBe(8)
    expect(pack.rows).toBe(2)
    expect(pack.cells[9]).toMatchObject({ col: 1, row: 1 })
  })

  it('a folha SVG posiciona cada tile na célula certa', () => {
    const svg = vectorTilesetSvg(makeTileset(3))
    expect(svg).toContain('width="48" height="16"')
    expect(svg).toContain('<svg x="32" y="0" width="16" height="16" viewBox="0 0 16 16">')
  })

  it('a lista de sólidos sai da MESMA função do pixel', () => {
    expect(tilesetSolidList(makeTileset(3))).toBe('1')
  })

  it('folha e mapa portáteis compartilham a fonte incorporada', async () => {
    const tileset = makeTileset(2)
    tileset.tiles[0]?.push({
      id: 'texto',
      type: 'text',
      x: 1,
      y: 12,
      text: 'A',
      fontSize: 10,
      fontFamily: 'fredoka',
      fill: '#ffffff',
      stroke: null,
      opacity: 1,
      rotation: 0,
    })
    const tilemap = makeTilemap(tileset.id)

    for (const svg of [
      await vectorTilesetPortableSvg(tileset),
      await vectorTilemapPortableSvg(tilemap, tileset),
    ]) {
      expect(svg).toContain("font-family:'Fredoka One'")
      expect(svg).toContain('data:font/woff2;base64,')
      expect(svg).not.toContain("font-family:'Bungee'")
    }
  })
})

describe('vectorTilemapSvg — símbolos + use', () => {
  it('define UM symbol por tile usado e um use por célula preenchida', () => {
    const tileset = makeTileset(3)
    const tilemap = makeTilemap(tileset.id)
    const svg = vectorTilemapSvg(tilemap, tileset)
    // Só os tiles 0 e 1 aparecem no mapa; o 2 não vira símbolo.
    expect(svg).toContain('<symbol id="tile-0"')
    expect(svg).toContain('<symbol id="tile-1"')
    expect(svg).not.toContain('<symbol id="tile-2"')
    // 4 células preenchidas = 4 use.
    expect(svg.match(/<use /g)).toHaveLength(4)
    expect(svg).toContain('<use href="#tile-1" x="16" y="0" width="16" height="16"/>')
    // A grade colável continua saindo do caminho compartilhado.
    expect(tilemapToStudioGrid(tilemap)).toBe('0 1 .;. 1 0')
  })
})

describe('rasterização (happy-dom)', () => {
  it('devolve null SEM pendurar a suíte', async () => {
    const tileset = makeTileset(2)
    expect(await vectorTilesetPngDataUrl(tileset)).toBeNull()
    expect(await vectorTilemapPngDataUrl(makeTilemap(tileset.id), tileset)).toBeNull()
  })
})
