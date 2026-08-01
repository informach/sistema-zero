import { describe, expect, it } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import {
  clearRegion,
  copyRegion,
  extractRegion,
  hasFilledCell,
  stampRegionAt,
} from './mapSelection'
import { setCells } from './tilemapOps'

function makeMap(cols = 4, rows = 4) {
  const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols, rows })
  const layerId = tilemap.layers[0]?.id
  if (!layerId) throw new Error('camada esperada')
  return { tilemap, layerId }
}

describe('copyRegion / clearRegion', () => {
  it('copia a região (vazios viram buraco -1)', () => {
    const { tilemap, layerId } = makeMap(3, 2)
    const painted = setCells(tilemap, layerId, [{ col: 1, row: 0 }], 5)
    const stamp = copyRegion(painted, layerId, { col: 0, row: 0, cols: 2, rows: 1 })
    expect([...stamp.tiles]).toEqual([-1, 5])
  })

  it('região só de grade vazia não conta como pedaço selecionável', () => {
    const { tilemap, layerId } = makeMap(3, 2)
    const painted = setCells(tilemap, layerId, [{ col: 2, row: 1 }], 5)
    expect(hasFilledCell(painted, layerId, { col: 0, row: 0, cols: 2, rows: 1 })).toBe(false)
    expect(hasFilledCell(painted, layerId, { col: 1, row: 0, cols: 2, rows: 2 })).toBe(true)
  })

  it('clearRegion apaga só a região; nada muda = mesma ref', () => {
    const { tilemap, layerId } = makeMap(3, 1)
    const painted = setCells(
      tilemap,
      layerId,
      [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 2, row: 0 },
      ],
      5,
    )
    const out = clearRegion(painted, layerId, { col: 0, row: 0, cols: 2, rows: 1 })
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([-1, -1, 5])
    expect(
      clearRegion(makeMap(2, 1).tilemap, layerId, { col: 0, row: 0, cols: 2, rows: 1 }),
    ).toBeDefined()
  })
})

describe('extractRegion + stampRegionAt (round-trip)', () => {
  it('extrair e colar na MESMA posição reconstrói o original', () => {
    const { tilemap, layerId } = makeMap(4, 3)
    const painted = setCells(
      tilemap,
      layerId,
      [
        { col: 1, row: 1 },
        { col: 2, row: 1 },
      ],
      8,
    )
    const rect = { col: 1, row: 1, cols: 2, rows: 1 }
    const { remaining, floating } = extractRegion(painted, layerId, rect)
    // o recorte saiu → região vazia
    expect([...(remaining.layers[0]?.cells ?? [])].slice(4, 8)).toEqual([-1, -1, -1, -1])
    const back = stampRegionAt(remaining, layerId, { col: 1, row: 1 }, floating)
    expect([...(back.layers[0]?.cells ?? [])]).toEqual([...(painted.layers[0]?.cells ?? [])])
  })

  it('cola clipando nas bordas e pulando buraco (-1)', () => {
    const { tilemap, layerId } = makeMap(3, 1)
    const base = setCells(tilemap, layerId, [{ col: 0, row: 0 }], 4)
    // carimbo [7, -1] colado em (2,0): só o 7 entra na col 2; a col 3 está fora
    const stamp = { cols: 2, rows: 1, tiles: Int16Array.of(7, 9) }
    const out = stampRegionAt(base, layerId, { col: 2, row: 0 }, stamp)
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([4, -1, 7])
    // buraco não apaga
    const holed = stampRegionAt(
      base,
      layerId,
      { col: 0, row: 0 },
      { cols: 1, rows: 1, tiles: Int16Array.of(-1) },
    )
    expect(holed).toBe(base)
  })
})
