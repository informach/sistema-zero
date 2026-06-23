import { describe, expect, test } from 'bun:test'
import {
  COLS,
  cellToWorld,
  clampCell,
  effectiveFootprint,
  ROWS,
  rectsOverlap,
  WALL_H_CELLS,
  wallLength,
  wallToWorld,
  worldToCell,
  worldToWallCell,
} from '../src/components/kids/room/coords'

describe('effectiveFootprint', () => {
  test('rot 0/2 mantém w×h; 90°/270° trocam largura×altura', () => {
    expect(effectiveFootprint(3, 2, 0)).toEqual({ w: 3, h: 2 })
    expect(effectiveFootprint(3, 2, 2)).toEqual({ w: 3, h: 2 })
    expect(effectiveFootprint(3, 2, 1)).toEqual({ w: 2, h: 3 })
    expect(effectiveFootprint(3, 2, 3)).toEqual({ w: 2, h: 3 })
  })
})

describe('clampCell', () => {
  test('arredonda e mantém dentro da grade', () => {
    expect(clampCell(2.4, 1.6, 1, 1)).toEqual({ x: 2, y: 2 })
  })
  test('prende às bordas respeitando o footprint', () => {
    expect(clampCell(-3, -3, 2, 2)).toEqual({ x: 0, y: 0 })
    expect(clampCell(99, 99, 3, 2)).toEqual({ x: COLS - 3, y: ROWS - 2 })
  })
})

describe('cellToWorld ↔ worldToCell', () => {
  test('centro do mundo de um 1×1 no canto (0,0)', () => {
    expect(cellToWorld(0, 0, 1, 1)).toEqual({ x: -COLS / 2 + 0.5, z: -ROWS / 2 + 0.5 })
  })
  test('round-trip célula→mundo→célula é estável (item 3×2)', () => {
    const corner = { x: 4, y: 2 }
    const w = cellToWorld(corner.x, corner.y, 3, 2)
    expect(worldToCell(w.x, w.z, 3, 2)).toEqual(corner)
  })
  test('worldToCell prende ao chão (cursor fora da grade → borda)', () => {
    expect(worldToCell(999, 999, 2, 2)).toEqual({ x: COLS - 2, y: ROWS - 2 })
  })
})

describe('paredes (itens que sobem)', () => {
  test('wallLength: right = colunas, left = linhas', () => {
    expect(wallLength('right')).toBe(COLS)
    expect(wallLength('left')).toBe(ROWS)
  })

  test('rectsOverlap: sobrepor vs apenas encostar', () => {
    expect(rectsOverlap(0, 0, 2, 2, 1, 1, 2, 2)).toBe(true)
    expect(rectsOverlap(0, 0, 2, 2, 2, 0, 2, 2)).toBe(false) // encostam, não sobrepõem
    expect(rectsOverlap(0, 0, 1, 1, 0, 0, 1, 1)).toBe(true)
  })

  test('wallToWorld ↔ worldToWallCell: round-trip estável (parede direita)', () => {
    const w = 2
    const h = 2
    const u = 3
    const v = 1
    const p = wallToWorld('right', u, v, w, h)
    expect(worldToWallCell('right', p.x, p.y, w, h)).toEqual({ u, v })
  })

  test('worldToWallCell prende aos limites da parede (altura inclusa)', () => {
    expect(worldToWallCell('right', 999, 999, 2, 2)).toEqual({ u: COLS - 2, v: WALL_H_CELLS - 2 })
  })
})
