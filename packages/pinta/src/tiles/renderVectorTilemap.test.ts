import { describe, expect, it } from 'bun:test'
import { createTilemapAsset, createVectorTilesetAsset } from '../core/project'
import type { VectorShape } from '../vector/model'
import { vectorTilemapSvg } from './renderVectorTilemap'

describe('vectorTilemapSvg', () => {
  it('inclui definições dos gradientes usados nos símbolos', () => {
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    const gradient: VectorShape = {
      id: 'forma',
      type: 'rect',
      x: 0,
      y: 0,
      w: 16,
      h: 16,
      rx: 0,
      fill: { type: 'linear', from: '#ff2121', to: '#003fad', angle: 90 },
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    tileset.tiles = [[gradient]]
    tileset.solid = [false]
    tileset.platform = [false]
    const tilemap = createTilemapAsset({
      name: 'fase',
      tilesetId: tileset.id,
      cols: 1,
      rows: 1,
    })
    const layer = tilemap.layers[0]
    if (!layer) throw new Error('camada esperada')
    layer.cells[0] = 0

    const svg = vectorTilemapSvg(tilemap, tileset)
    expect(svg).toContain('<linearGradient id="tile-0-pin-grad-forma"')
    expect(svg).toContain('fill="url(#tile-0-pin-grad-forma)"')
  })

  it('inclui a definição prefixada da máscara usada dentro do símbolo', () => {
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    const content: VectorShape = {
      id: 'rosto',
      type: 'rect',
      x: 0,
      y: 0,
      w: 16,
      h: 16,
      rx: 0,
      fill: '#78dc52',
      stroke: null,
      opacity: 1,
      rotation: 0,
      maskId: 'janela',
    }
    const source: VectorShape = {
      id: 'janela',
      type: 'ellipse',
      cx: 8,
      cy: 8,
      rx: 4,
      ry: 4,
      fill: '#ffffff',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    tileset.tiles = [[content, source]]
    tileset.solid = [false]
    tileset.platform = [false]
    const tilemap = createTilemapAsset({
      name: 'fase',
      tilesetId: tileset.id,
      cols: 1,
      rows: 1,
    })
    const layer = tilemap.layers[0]
    if (!layer) throw new Error('camada esperada')
    layer.cells[0] = 0

    const svg = vectorTilemapSvg(tilemap, tileset)
    expect(svg).toContain('id="tile-0-pin-mask-janela"')
    expect(svg).toContain('clip-path="url(#tile-0-pin-mask-janela)"')
  })
})
