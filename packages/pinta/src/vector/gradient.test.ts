import { describe, expect, it } from 'bun:test'
import { gradientGeometry, gradientPointForShape, moveGradientHandle } from './gradient'
import type { VectorGradient, VectorShape } from './model'

const radial: VectorGradient = { type: 'radial', from: '#ffffff', to: '#000000', angle: 0 }
const linear: VectorGradient = { type: 'linear', from: '#ffffff', to: '#000000', angle: 0 }

describe('geometria do degradê', () => {
  it('mantém os padrões dos desenhos existentes', () => {
    expect(gradientGeometry(radial)).toEqual({
      type: 'radial',
      center: { x: 0.5, y: 0.5 },
      radius: 0.5,
    })
    expect(gradientGeometry(linear)).toEqual({
      type: 'linear',
      start: { x: 0, y: 0.5 },
      end: { x: 1, y: 0.5 },
    })
  })

  it('move o brilho e ajusta seu alcance', () => {
    const moved = moveGradientHandle(radial, 'center', { x: 0.25, y: 0.2 })
    expect(gradientGeometry(moved)).toEqual({
      type: 'radial',
      center: { x: 0.25, y: 0.2 },
      radius: 0.5,
    })
    const resized = moveGradientHandle(moved, 'radius', { x: 1.05, y: 0.2 })
    expect(gradientGeometry(resized)).toEqual({
      type: 'radial',
      center: { x: 0.25, y: 0.2 },
      radius: 0.8,
    })
  })

  it('move as duas pontas do linear sem alterar a cor', () => {
    const moved = moveGradientHandle(
      moveGradientHandle(linear, 'start', { x: 0.2, y: 0.1 }),
      'end',
      { x: 0.9, y: 0.8 },
    )
    expect(gradientGeometry(moved)).toEqual({
      type: 'linear',
      start: { x: 0.2, y: 0.1 },
      end: { x: 0.9, y: 0.8 },
    })
    expect(moved.from).toBe(linear.from)
    expect(moved.to).toBe(linear.to)
  })

  it('não injeta coordenadas inválidas em renderizações sem sanitize prévio', () => {
    const unsafe = {
      ...radial,
      center: { x: '0" onload="alert(1)', y: 0.2 },
      radius: Number.POSITIVE_INFINITY,
    } as unknown as VectorGradient
    expect(gradientGeometry(unsafe)).toEqual({
      type: 'radial',
      center: { x: 0.5, y: 0.5 },
      radius: 0.5,
    })
    expect(gradientGeometry({ ...linear, angle: Number.NaN })).toEqual({
      type: 'linear',
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
    })
  })

  it('não deixa as duas pontas lineares colapsarem no mesmo ponto', () => {
    expect(moveGradientHandle(linear, 'start', { x: 1, y: 0.5 })).toBe(linear)
  })

  it('converte o ponto do documento para a caixa local de uma forma girada', () => {
    const shape: VectorShape = {
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      rx: 0,
      fill: radial,
      stroke: null,
      opacity: 1,
      rotation: 90,
    }
    const point = gradientPointForShape(shape, { x: 80, y: 25 })
    expect(point.x).toBeCloseTo(0.25)
    expect(point.y).toBeCloseTo(0.2)
  })
})
