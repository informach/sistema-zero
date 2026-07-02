import { describe, expect, it } from 'bun:test'
import { createTilemapAsset, PINTA_LIMITS } from '../core/project'
import {
  addLayer,
  cellAt,
  flattenLayers,
  floodFillCells,
  removeLayer,
  setCell,
  toggleLayerVisible,
} from './tilemapOps'

function makeMap(cols = 3, rows = 2) {
  const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols, rows })
  const layerId = tilemap.layers[0]?.id
  if (!layerId) throw new Error('camada esperada')
  return { tilemap, layerId }
}

describe('setCell / cellAt', () => {
  it('carimba e lê; fora dos limites é no-op', () => {
    const { tilemap, layerId } = makeMap()
    const out = setCell(tilemap, layerId, 1, 1, 4)
    expect(cellAt(out, layerId, 1, 1)).toBe(4)
    expect(setCell(out, layerId, 9, 0, 1)).toBe(out)
    expect(setCell(out, layerId, 1, 1, 4)).toBe(out) // mesmo valor = mesma ref
  })
})

describe('floodFillCells', () => {
  it('preenche a região contígua (conectividade-4)', () => {
    const { tilemap, layerId } = makeMap(3, 1)
    // [., 5, .] → fill(0,0, 7) só pinta a célula 0 (o 5 bloqueia).
    const blocked = setCell(tilemap, layerId, 1, 0, 5)
    const out = floodFillCells(blocked, layerId, 0, 0, 7)
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([7, 5, -1])
  })

  it('mapa vazio inteiro é preenchido', () => {
    const { tilemap, layerId } = makeMap(2, 2)
    const out = floodFillCells(tilemap, layerId, 0, 0, 3)
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([3, 3, 3, 3])
  })
})

describe('camadas', () => {
  it('addLayer respeita a quota; removeLayer nunca deixa zero', () => {
    const { tilemap } = makeMap()
    let out = tilemap
    for (let i = 0; i < PINTA_LIMITS.maxTilemapLayers + 2; i += 1) {
      out = addLayer(out, `c${i}`)
    }
    expect(out.layers).toHaveLength(PINTA_LIMITS.maxTilemapLayers)

    let shrunk = out
    for (const layer of out.layers) shrunk = removeLayer(shrunk, layer.id)
    expect(shrunk.layers).toHaveLength(1)
  })

  it('flattenLayers: a camada de CIMA vence; invisível não conta', () => {
    const { tilemap, layerId } = makeMap(2, 1)
    let out = setCell(tilemap, layerId, 0, 0, 1)
    out = setCell(out, layerId, 1, 0, 2)
    out = addLayer(out, 'topo')
    const top = out.layers[1]
    if (!top) throw new Error('camada esperada')
    out = setCell(out, top.id, 0, 0, 9)

    expect([...flattenLayers(out)]).toEqual([9, 2])
    const hidden = toggleLayerVisible(out, top.id)
    expect([...flattenLayers(hidden)]).toEqual([1, 2])
  })
})
