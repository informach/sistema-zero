import { describe, expect, it } from 'bun:test'
import { createTilemapAsset, type TilemapAsset, type TileTerrain } from '../core/project'
import { tileLayerAt } from '../testing/fixtures'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellTile, makeCell } from './cell'
import { updateMapLayer } from './layerTree'
import { paintTerrain, terrainRegion } from './terrain'
import { setCell } from './tilemapOps'

/** Peça de fora do terreno (uma árvore, por exemplo). */
const DE_FORA = 300
const SLOTS = { corner: [1, 3, 5, 7], edge: [0, 2, 4, 6], mixed: [0, 1, 2, 3, 4, 5, 6, 7] }

/** Um terreno completo: uma peça para cada combinação dos encaixes do modo. */
function terreno(mode: TileTerrain['mode']): TileTerrain {
  const slots = SLOTS[mode],
    tiles: Record<string, number[]> = {}
  for (let bits = 1; bits < 1 << slots.length; bits++) {
    const pattern = Array(8).fill(0)
    for (const [i, s] of slots.entries()) if (bits & (1 << i)) pattern[s] = 1
    tiles[String(bits)] = pattern
  }
  return { id: 't', name: 'Grama', mode, colors: ['#00ff00'], tiles }
}
const mapa = (): TilemapAsset =>
  createTilemapAsset({ name: 'fase', tilesetId: 'ts', cols: 5, rows: 5 })
const peca = (m: TilemapAsset, col: number, row: number): number =>
  cellTile(tileLayerAt(m).cells[row * m.cols + col] ?? -1)

describe('terreno inteligente não estraga peças de fora', () => {
  for (const mode of ['corner', 'edge', 'mixed'] as const) {
    it(`modo ${mode}: as vizinhas com peça de fora ficam como estavam`, () => {
      let m = mapa()
      const id = tileLayerAt(m).id
      for (const [c, r] of [
        [1, 1],
        [1, 2],
        [2, 1],
        [3, 3],
      ] as const)
        m = setCell(m, id, c, r, DE_FORA)
      const result = paintTerrain(m, id, terreno(mode), 1, [{ col: 2, row: 2 }])
      expect(result.unmatched).toBe(0)
      expect(result.map).not.toBe(m)
      for (const [c, r] of [
        [1, 1],
        [1, 2],
        [2, 1],
        [3, 3],
      ] as const)
        expect(peca(result.map, c, r)).toBe(DE_FORA)
      // A casa pintada recebe uma peça do terreno.
      expect(terreno(mode).tiles[String(peca(result.map, 2, 2))]).toBeDefined()
    })
  }
  it('a casa pintada troca a peça de fora por uma do terreno', () => {
    let m = mapa()
    const id = tileLayerAt(m).id
    m = setCell(m, id, 2, 2, DE_FORA)
    const result = paintTerrain(m, id, terreno('edge'), 1, [{ col: 2, row: 2 }])
    expect(peca(result.map, 2, 2)).toBe(15)
  })
  it('a vizinha vazia ganha a borda e a vizinha do terreno se ajusta', () => {
    const m = mapa(),
      id = tileLayerAt(m).id
    const t = terreno('corner')
    const um = paintTerrain(m, id, t, 1, [{ col: 2, row: 2 }]).map
    // Canto de cima à esquerda da casa (2,2) = canto de baixo à direita da (1,1).
    expect(t.tiles[String(peca(um, 1, 1))]).toEqual([0, 0, 0, 1, 0, 0, 0, 0])
    const dois = paintTerrain(um, id, t, 1, [{ col: 1, row: 1 }]).map
    expect(peca(dois, 1, 1)).toBe(15)
  })
  it('vizinha sem encaixe novo não é sorteada de novo', () => {
    const t = terreno('edge')
    // Duas peças iguais para o mesmo encaixe: a semente escolheria entre elas.
    t.tiles['99'] = [...t.tiles['15']!]
    let m = mapa()
    const id = tileLayerAt(m).id
    m = setCell(m, id, 0, 0, 99)
    m = setCell(m, id, 1, 1, 15)
    for (let seed = 1; seed < 8; seed++) {
      const out = paintTerrain(m, id, t, 1, [{ col: 1, row: 1 }], seed).map
      // (0,0) só toca (1,1) pelo canto: no modo bordas não muda.
      expect(peca(out, 0, 0)).toBe(99)
    }
  })
  it('camada trancada não é pintada', () => {
    let m = mapa()
    const id = tileLayerAt(m).id
    m = updateMapLayer(m, id, { locked: true })
    expect(paintTerrain(m, id, terreno('corner'), 1, [{ col: 2, row: 2 }]).map).toBe(m)
  })
})

describe('terrainRegion', () => {
  it('junta as casas vizinhas com a mesma peça e para na peça diferente', () => {
    let m = mapa()
    const id = tileLayerAt(m).id
    for (let r = 0; r < 5; r++) m = setCell(m, id, 2, r, 7)
    const left = terrainRegion(m, id, { col: 0, row: 0 })
    expect(left).toHaveLength(10)
    expect(left.every((p) => p.col < 2)).toBe(true)
    expect(terrainRegion(m, id, { col: 2, row: 3 })).toHaveLength(5)
  })
  it('com terreno, compara o encaixe e não o número da peça', () => {
    const t = terreno('edge')
    t.tiles['99'] = [...t.tiles['15']!]
    let m = mapa()
    const id = tileLayerAt(m).id
    m = setCell(m, id, 0, 0, 15)
    m = setCell(m, id, 1, 0, 99)
    m = setCell(m, id, 2, 0, 3)
    expect(terrainRegion(m, id, { col: 0, row: 0 })).toHaveLength(1)
    expect(terrainRegion(m, id, { col: 0, row: 0 }, t)).toHaveLength(2)
  })
  it('fora do mapa ou camada que não existe devolve vazio', () => {
    const m = mapa()
    expect(terrainRegion(m, tileLayerAt(m).id, { col: -1, row: 0 })).toEqual([])
    expect(terrainRegion(m, 'nada', { col: 0, row: 0 })).toEqual([])
  })
})

describe('regressões da revisão de terrenos', () => {
  for (const [flags, visual] of [
    [0, 1],
    [CELL_FLIP_H, 1],
    [CELL_FLIP_V, 4],
    [CELL_FLIP_H | CELL_FLIP_V, 4],
    [CELL_FLIP_D, 8],
    [CELL_FLIP_D | CELL_FLIP_H, 2],
    [CELL_FLIP_D | CELL_FLIP_V, 8],
    [CELL_FLIP_D | CELL_FLIP_H | CELL_FLIP_V, 2],
  ])
    it(`bordas também seguem os oito espelhos e giros: ${flags}`, () => {
      const m = createTilemapAsset({ name: 'flags', tilesetId: 'ts', cols: 3, rows: 1 })
      const layer = tileLayerAt(m),
        t = terreno('edge')
      layer.cells = Int16Array.of(makeCell(1, flags), -1, -1)
      const result = paintTerrain(m, layer.id, t, 1, [{ col: 1, row: 0 }])
      expect(result.unmatched).toBe(0)
      // Encaixe que já estava certo conserva a peça e seus flags, sem sortear outra variação.
      expect(tileLayerAt(result.map).cells[0]).toBe(visual === 2 ? makeCell(1, flags) : visual! | 2)
    })
  it('balde no vazio não atravessa árvores ou casas alheias ao terreno', () => {
    const m = createTilemapAsset({ name: 'canto', tilesetId: 'ts', cols: 3, rows: 1 })
    const layer = tileLayerAt(m),
      t = terreno('corner')
    layer.cells = Int16Array.of(16, -1, 17)
    const region = terrainRegion(m, layer.id, { col: 1, row: 0 }, t)
    expect(region).toEqual([{ col: 1, row: 0 }])
    const result = paintTerrain(m, layer.id, t, 1, region)
    expect([...tileLayerAt(result.map).cells]).toEqual([16, 15, 17])
    expect(terrainRegion(m, layer.id, { col: 0, row: 0 }, t)).toEqual([{ col: 0, row: 0 }])
  })
  for (const [flags, visual] of [
    [0, 1],
    [CELL_FLIP_H, 8],
    [CELL_FLIP_V, 2],
    [CELL_FLIP_H | CELL_FLIP_V, 4],
    [CELL_FLIP_D, 4],
    [CELL_FLIP_D | CELL_FLIP_H, 2],
    [CELL_FLIP_D | CELL_FLIP_V, 8],
    [CELL_FLIP_D | CELL_FLIP_H | CELL_FLIP_V, 1],
  ])
    it(`vizinhos e balde respeitam os encaixes visuais com flags ${flags}`, () => {
      const m = createTilemapAsset({ name: 'flags', tilesetId: 'ts', cols: 3, rows: 1 })
      const layer = tileLayerAt(m),
        t = terreno('corner')
      layer.cells = Int16Array.of(makeCell(1, flags), -1, -1)
      const result = paintTerrain(m, layer.id, t, 1, [{ col: 1, row: 0 }])
      expect(result.unmatched).toBe(0)
      // A nova casa acrescenta os dois cantos direitos, preservando qualquer canto à esquerda.
      expect(cellTile(tileLayerAt(result.map).cells[0]!)).toBe(visual! | 3)
      layer.cells = Int16Array.of(makeCell(1, flags), visual!, -1)
      expect(terrainRegion(m, layer.id, { col: 0, row: 0 }, t)).toHaveLength(2)
    })
})
