import { describe, expect, it } from 'bun:test'
import { createModelAsset, createPart } from '../core/model'
import { makeModel } from '../testing/fixtures'
import { projectModelThumb } from './isoThumb'

describe('miniatura isométrica pura', () => {
  it('uma caixa mostra só as 3 faces viradas para a câmera (6 triângulos), em 3 tons', () => {
    const model = createModelAsset({ name: 'caixa', starter: false, now: 1 })
    model.parts = [createPart({ name: 'caixa', from: [-1, 0, -1], to: [1, 2, 1], color: 8 })]
    const projection = projectModelThumb(model)
    expect(projection).not.toBeNull()
    expect(projection?.polygons).toHaveLength(6)
    // px, py e pz têm normais diferentes: 3 tons da mesma cor base.
    expect(new Set(projection?.polygons.map((polygon) => polygon.fill)).size).toBe(3)
    for (const polygon of projection?.polygons ?? []) {
      const numbers = polygon.points.split(/[ ,]/).map(Number)
      expect(numbers).toHaveLength(6)
      expect(numbers.every(Number.isFinite)).toBe(true)
      expect(polygon.fill).toMatch(/^#[0-9a-f]{6}$/)
    }
    const [x, y, width, height] = (projection?.viewBox ?? '').split(' ').map(Number)
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  it('a face de cima é a mais clara (o sol vem de cima) e a ordem é do fundo para a frente', () => {
    const model = createModelAsset({ name: 'duas', starter: false, now: 1 })
    model.parts = [
      createPart({ id: 'fundo', name: 'fundo', from: [-6, 0, -6], to: [-4, 2, -4], color: 8 }),
      createPart({ id: 'frente', name: 'frente', from: [4, 0, 4], to: [6, 2, 6], color: 2 }),
    ]
    const projection = projectModelThumb(model)
    if (!projection) throw new Error('esperava projeção')
    // 12 polígonos: os 6 primeiros são da caixa do fundo (azul), os 6 últimos da da frente (vermelha).
    expect(projection.polygons).toHaveLength(12)
    const blueish = (fill: string) =>
      Number.parseInt(fill.slice(5, 7), 16) > Number.parseInt(fill.slice(1, 3), 16)
    expect(projection.polygons.slice(0, 6).every((polygon) => blueish(polygon.fill))).toBe(true)
    expect(projection.polygons.slice(6).every((polygon) => !blueish(polygon.fill))).toBe(true)
  })

  it('o modelo do fixture (com rampa girada) projeta; vazio e pesado demais devolvem null', () => {
    expect(projectModelThumb(makeModel())).not.toBeNull()
    expect(projectModelThumb(makeModel({ parts: [] }))).toBeNull()
    expect(projectModelThumb(makeModel(), { maxTriangles: 1 })).toBeNull()
  })

  it('é determinística', () => {
    expect(projectModelThumb(makeModel())).toEqual(projectModelThumb(makeModel()))
  })
})
