import { describe, expect, it } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  PINTA_LIMITS,
  type TilemapAsset,
} from '../core/project'
import { setCell } from './tilemapOps'
import { addTile, duplicateTile, remapTilemapCells, removeTile, toggleSolid } from './tilesetOps'

const makeTileset = () => createTilesetAsset({ name: 'pecas', tileSize: 16 })

function makeMap(): TilemapAsset {
  const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 3, rows: 1 })
  const layerId = tilemap.layers[0]?.id
  if (!layerId) throw new Error('camada esperada')
  // células: [0, 1, 2]
  let out = setCell(tilemap, layerId, 0, 0, 0)
  out = setCell(out, layerId, 1, 0, 1)
  out = setCell(out, layerId, 2, 0, 2)
  return out
}

describe('tilesetOps', () => {
  it('addTile insere VAZIO após o índice, com solid=false alinhado', () => {
    const base = toggleSolid(makeTileset(), 0)
    const out = addTile(base, 0)
    expect(out.tiles).toHaveLength(2)
    expect(out.solid).toEqual([true, false])
    expect(out.tiles[1]?.data.every((v) => v === 0)).toBe(true)
  })

  it('duplicateTile copia bitmap E o flag de sólido', () => {
    let base = makeTileset()
    const tile = base.tiles[0]
    if (tile) tile.data[0] = 5
    base = toggleSolid(base, 0)
    const out = duplicateTile(base, 0)
    expect(out.tiles[1]?.data[0]).toBe(5)
    expect(out.tiles[1]).not.toBe(tile as never)
    expect(out.solid).toEqual([true, true])
  })

  it('removeTile nunca deixa o tileset vazio; quota barra add/duplicate', () => {
    const base = makeTileset()
    expect(removeTile(base, 0)).toBe(base)
    let full = base
    for (let i = 0; i < PINTA_LIMITS.maxTiles + 2; i += 1) full = addTile(full, 0)
    expect(full.tiles).toHaveLength(PINTA_LIMITS.maxTiles)
    expect(duplicateTile(full, 0)).toBe(full)
  })
})

describe('remapTilemapCells (invariante índice-no-array = índice-no-mapa)', () => {
  it('inserir no meio: índices ≥ insertedAt sobem 1 (célula segue na MESMA peça)', () => {
    const map = makeMap()
    const out = remapTilemapCells(map, { insertedAt: 1 })
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([0, 2, 3])
  })

  it('remover: célula do índice removido vira vazia; maiores descem 1', () => {
    const map = makeMap()
    const out = remapTilemapCells(map, { removedAt: 1 })
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([0, -1, 1])
  })

  it('sem mudança → mesma referência (não suja autosave)', () => {
    const map = makeMap()
    // Inserir DEPOIS de todos os índices usados não muda nada.
    expect(remapTilemapCells(map, { insertedAt: 99 })).toBe(map)
  })
})
