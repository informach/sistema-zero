import { describe, expect, it } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import {
  blockCells,
  singleTileStamp,
  stampCells,
  stampFromTileset,
  stampTileAt,
  type TileStamp,
} from './stamp'

function makeMap(cols = 4, rows = 4) {
  const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols, rows })
  const layerId = tilemap.layers[0]?.id
  if (!layerId) throw new Error('camada esperada')
  return { tilemap, layerId }
}

describe('stampFromTileset', () => {
  it('recorta um retângulo da grade da folha (columns=8)', () => {
    // tileCount 10, columns 8 → tiles 0..9. Retângulo 2×2 a partir de (0,0).
    const stamp = stampFromTileset(10, 8, { col: 0, row: 0, cols: 2, rows: 2 })
    expect(stamp.cols).toBe(2)
    expect(stamp.rows).toBe(2)
    // linha 0: 0,1 ; linha 1: 8,9
    expect([...stamp.tiles]).toEqual([0, 1, 8, 9])
  })

  it('posições além do tileCount viram buraco (-1)', () => {
    // tileCount 3, columns 2 → tiles 0,1 / 2,(vazio). Retângulo 2×2.
    const stamp = stampFromTileset(3, 2, { col: 0, row: 0, cols: 2, rows: 2 })
    expect([...stamp.tiles]).toEqual([0, 1, 2, -1])
  })
})

describe('stampTileAt (padrão módulo ancorado)', () => {
  it('repete o padrão em módulo, inclusive à frente da âncora (módulo negativo)', () => {
    const stamp: TileStamp = { cols: 2, rows: 1, tiles: Int16Array.of(5, 6) }
    const anchor = { col: 3, row: 0 }
    expect(stampTileAt(stamp, anchor, 3, 0)).toBe(5)
    expect(stampTileAt(stamp, anchor, 4, 0)).toBe(6)
    expect(stampTileAt(stamp, anchor, 5, 0)).toBe(5)
    // uma célula ANTES da âncora: col 2 → mod(2-3,2)=1 → 6
    expect(stampTileAt(stamp, anchor, 2, 0)).toBe(6)
  })
})

describe('blockCells', () => {
  it('o bloco encaixado que contém a célula visitada', () => {
    const stamp: TileStamp = { cols: 2, rows: 2, tiles: Int16Array.of(0, 1, 2, 3) }
    const anchor = { col: 0, row: 0 }
    // visitar (3,3) → bloco começa em (2,2)
    expect(blockCells({ col: 3, row: 3 }, anchor, stamp)).toEqual([
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      { col: 2, row: 3 },
      { col: 3, row: 3 },
    ])
  })

  it('encaixa em direção negativa (célula antes da âncora)', () => {
    const stamp: TileStamp = { cols: 2, rows: 2, tiles: Int16Array.of(0, 1, 2, 3) }
    const anchor = { col: 4, row: 4 }
    // visitar (3,3) → floor((3-4)/2) = -1 → bloco começa em (2,2)
    expect(blockCells({ col: 3, row: 3 }, anchor, stamp)[0]).toEqual({ col: 2, row: 2 })
  })
})

describe('stampCells', () => {
  it('aplica o padrão, pula buraco (-1) e índice ≥ tileCount', () => {
    const { tilemap, layerId } = makeMap(4, 1)
    // carimbo [7, -1] a partir de (0,0), tileCount 8
    const stamp: TileStamp = { cols: 2, rows: 1, tiles: Int16Array.of(7, -1) }
    const cells = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
    ]
    const out = stampCells(tilemap, layerId, cells, stamp, { col: 0, row: 0 }, 8)
    // 7 no par, buraco no ímpar → [7, -1, 7, -1]
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([7, -1, 7, -1])
  })

  it('índice ≥ tileCount é pulado (carimbo obsoleto após remap)', () => {
    const { tilemap, layerId } = makeMap(2, 1)
    const stamp = singleTileStamp(99)
    const out = stampCells(
      tilemap,
      layerId,
      [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
      ],
      stamp,
      { col: 0, row: 0 },
      8,
    )
    expect(out).toBe(tilemap) // nada mudou
  })

  it('mesmo conteúdo devolve a mesma ref', () => {
    const { tilemap, layerId } = makeMap(2, 1)
    const stamp = singleTileStamp(-1)
    const out = stampCells(tilemap, layerId, [{ col: 0, row: 0 }], stamp, { col: 0, row: 0 }, 8)
    expect(out).toBe(tilemap)
  })
})
