import { expect, test } from 'bun:test'
import { previewCells } from './FocalRegionMapStage'

const map = { origin: { col: -4, row: -2 }, cols: 8, rows: 4 }

test('a prévia do lápis e da borracha é o caminho da pincelada', () => {
  const path = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 1, row: 1 },
  ]
  expect(previewCells({ tool: 'pencil', path }, map)).toEqual(path)
  expect(previewCells({ tool: 'eraser', path }, map)).toEqual(path)
})

test('a prévia da linha liga o começo ao ponto de agora, sem os pontos do meio', () => {
  const path = [
    { col: 0, row: 0 },
    { col: 2, row: 1 },
    { col: 3, row: 0 },
  ]
  expect(previewCells({ tool: 'line', path }, map)).toEqual([
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
    { col: 3, row: 0 },
  ])
})

test('a prévia do retângulo cobre a área inteira e para na borda do cenário', () => {
  const cells = previewCells(
    {
      tool: 'rect',
      path: [
        { col: 2, row: 0 },
        { col: 9, row: 5 },
      ],
    },
    map,
  )
  // O cenário vai da coluna -4 à 3 e da linha -2 à 1: o canto de fora fica na borda.
  expect(cells).toHaveLength(2 * 2)
  expect(cells).toContainEqual({ col: 3, row: 1 })
  expect(cells.every(({ col, row }) => col >= 2 && col <= 3 && row >= 0 && row <= 1)).toBe(true)
})
