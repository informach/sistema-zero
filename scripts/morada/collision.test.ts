import { expect, test } from 'bun:test'
import type { MoradaVector } from '../../packages/core/src/morada/types'
import { meshNavigationColliders, wallColliders } from './collision'

const contains = (boxes: ReturnType<typeof wallColliders>, p: [number, number, number]) =>
  boxes.some((b) => b.center.every((v, i) => Math.abs((p[i] ?? 0) - v) < (b.size[i] ?? 0) / 2))
test('porta conserva passagem livre e parede acima e dos lados', () => {
  const boxes = wallColliders(2, 3, 0.15, [
    { cx: 1, larg: 0.9, peitoril: 0, alt: 2.1, tipo: 'ret' },
  ])
  expect(contains(boxes, [1, 1, 0])).toBe(false)
  expect(contains(boxes, [0.2, 1, 0])).toBe(true)
  expect(contains(boxes, [1, 2.5, 0])).toBe(true)
})
test('janela conserva peitoril e duas janelas não removem o montante', () => {
  const boxes = wallColliders(4, 3, 0.15, [
    { cx: 1, larg: 1.2, peitoril: 0.9, alt: 1.1, tipo: 'ret' },
    { cx: 3, larg: 1.2, peitoril: 0.9, alt: 1.1, tipo: 'ret' },
  ])
  expect(contains(boxes, [1, 1.4, 0])).toBe(false)
  expect(contains(boxes, [1, 0.5, 0])).toBe(true)
  expect(contains(boxes, [2, 1.4, 0])).toBe(true)
})
test('arco tem centro livre e topo curvo sólido', () => {
  const boxes = wallColliders(2, 3, 0.15, [
    { cx: 1, larg: 1.2, peitoril: 0, alt: 2.4, tipo: 'arco' },
  ])
  expect(contains(boxes, [1, 2, 0])).toBe(false)
  expect(contains(boxes, [0.45, 2.3, 0])).toBe(true)
})

test('ocupação de malha preserva o vão e não preenche o retângulo externo do desenho', () => {
  const triangles: MoradaVector[][] = []
  const panel = (x0: number, x1: number, y0: number, y1: number) =>
    triangles.push(
      [
        [x0, y0, 0],
        [x1, y0, 0],
        [x0, y1, 0],
      ],
      [
        [x0, y1, 0],
        [x1, y0, 0],
        [x1, y1, 0],
      ],
    )
  panel(-2, -0.75, 0, 3)
  panel(0.75, 2, 0, 3)
  panel(-0.75, 0.75, 2, 3)
  const boxes = meshNavigationColliders(triangles)
  expect(contains(boxes, [0.125, 1.125, 0.125])).toBe(false)
  expect(contains(boxes, [-1.125, 1.125, 0.125])).toBe(true)
  expect(contains(boxes, [0.125, 2.625, 0.125])).toBe(true)
})
