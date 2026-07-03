import { describe, expect, it } from 'bun:test'
import {
  boundsCenter,
  parsePathD,
  rotatePoint,
  rotateShapeTo,
  scaleShape,
  setShapeNode,
  shapeBounds,
  shapeNodes,
  translateShape,
} from './geometry'
import type { VectorShape } from './model'

const base = { id: 's1', fill: '#ff0000', stroke: null, opacity: 1, rotation: 0 }

const rect: VectorShape = { ...base, type: 'rect', x: 10, y: 20, w: 30, h: 40, rx: 0 }
const ellipse: VectorShape = { ...base, type: 'ellipse', cx: 50, cy: 50, rx: 10, ry: 20 }
const line: VectorShape = { ...base, type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }
const polygon: VectorShape = {
  ...base,
  type: 'polygon',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 10 },
  ],
}
const path: VectorShape = { ...base, type: 'path', d: 'M 0 0 C 1 1 2 2 10 10' }
const text: VectorShape = { ...base, type: 'text', x: 5, y: 30, text: 'oi', fontSize: 20 }

describe('parsePathD', () => {
  it('aceita o NOSSO formato (M/L/C/Z absolutos)', () => {
    expect(parsePathD('M 0 0 L 5 5 Z')?.commands).toHaveLength(3)
  })

  it('recusa comandos relativos/desconhecidos (fica quieto)', () => {
    expect(parsePathD('m 0 0 l 5 5')).toBeNull()
    expect(parsePathD('M 0 0 Q 1 1 2 2')).toBeNull()
  })
})

describe('shapeBounds', () => {
  it('caixa por tipo', () => {
    expect(shapeBounds(rect)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
    expect(shapeBounds(ellipse)).toEqual({ x: 40, y: 30, width: 20, height: 40 })
    expect(shapeBounds(polygon)).toEqual({ x: 0, y: 0, width: 10, height: 10 })
    expect(shapeBounds(path)).toEqual({ x: 0, y: 0, width: 10, height: 10 })
    expect(boundsCenter(shapeBounds(rect))).toEqual({ x: 25, y: 40 })
  })
})

describe('translateShape', () => {
  it('move todos os tipos (inclusive o `d` do path)', () => {
    expect(translateShape(rect, 5, -5)).toMatchObject({ x: 15, y: 15 })
    expect(translateShape(ellipse, 1, 1)).toMatchObject({ cx: 51, cy: 51 })
    expect(translateShape(line, 2, 3)).toMatchObject({ x1: 2, y1: 3, x2: 12, y2: 13 })
    const movedPolygon = translateShape(polygon, 1, 1)
    expect(movedPolygon.type === 'polygon' && movedPolygon.points[0]).toEqual({ x: 1, y: 1 })
    const movedPath = translateShape(path, 10, 0)
    expect(movedPath.type === 'path' && movedPath.d).toBe('M 10 0 C 11 1 12 2 20 10')
    expect(translateShape(text, 5, 5)).toMatchObject({ x: 10, y: 35 })
  })
})

describe('scaleShape', () => {
  it('escala em torno da âncora', () => {
    const scaled = scaleShape(rect, { x: 10, y: 20 }, 2, 0.5)
    expect(scaled).toMatchObject({ x: 10, y: 20, w: 60, h: 20 })
    const scaledPath = scaleShape(path, { x: 0, y: 0 }, 2, 2)
    expect(scaledPath.type === 'path' && scaledPath.d).toBe('M 0 0 C 2 2 4 4 20 20')
  })

  it('fator degenerado não colapsa (mínimo 5%)', () => {
    const scaled = scaleShape(rect, { x: 10, y: 20 }, 0, 0)
    expect(scaled.type === 'rect' && scaled.w).toBeGreaterThan(0)
  })

  it('texto escala o fontSize com teto', () => {
    const scaled = scaleShape(text, { x: 0, y: 0 }, 100, 100)
    expect(scaled.type === 'text' && scaled.fontSize).toBe(200)
  })
})

describe('rotateShapeTo', () => {
  it('normaliza para 0–360', () => {
    expect(rotateShapeTo(rect, 370).rotation).toBe(10)
    expect(rotateShapeTo(rect, -90).rotation).toBe(270)
  })
})

describe('reshape (shapeNodes / setShapeNode)', () => {
  it('lista os nós on-curve por tipo', () => {
    expect(shapeNodes(polygon)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ])
    expect(shapeNodes(line)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ])
    // Path M + C: 2 nós (o ponto do M e o fim do C), sem os controles.
    expect(shapeNodes(path)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ])
    // Paramétricos não têm nós (editam pela bbox).
    expect(shapeNodes(rect)).toEqual([])
    expect(shapeNodes(ellipse)).toEqual([])
  })

  it('move um vértice do polígono', () => {
    const moved = setShapeNode(polygon, 2, { x: 7, y: 12 })
    expect(moved.type === 'polygon' && moved.points[2]).toEqual({ x: 7, y: 12 })
    expect(moved.type === 'polygon' && moved.points[0]).toEqual({ x: 0, y: 0 })
  })

  it('move uma ponta da linha', () => {
    expect(setShapeNode(line, 1, { x: 20, y: 5 })).toMatchObject({ x2: 20, y2: 5, x1: 0, y1: 0 })
  })

  it('mover o fim de um C arrasta o controle de saída junto', () => {
    // 'M 0 0 C 1 1 2 2 10 10' → mover o nó final (index 1) em +5,+5 move o
    // control2 (2,2 → 7,7) e o anchor (10,10 → 15,15). Sem próximo C.
    const moved = setShapeNode(path, 1, { x: 15, y: 15 })
    expect(moved.type === 'path' && moved.d).toBe('M 0 0 C 1 1 7 7 15 15')
  })

  it('índice fora da faixa devolve o shape sem mudar', () => {
    expect(setShapeNode(line, 5, { x: 0, y: 0 })).toBe(line)
  })
})

describe('rotatePoint', () => {
  it('gira em torno do centro (90° leva (1,0)→(0,1) relativo)', () => {
    const p = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90)
    expect(p.x).toBeCloseTo(0, 5)
    expect(p.y).toBeCloseTo(1, 5)
  })

  it('0° devolve cópia igual', () => {
    expect(rotatePoint({ x: 3, y: 4 }, { x: 1, y: 1 }, 0)).toEqual({ x: 3, y: 4 })
  })
})

describe('flipShape', () => {
  it('espelha rect/linha em torno do centro e inverte a rotação', async () => {
    const { flipShape, shapeBounds, boundsCenter } = await import('./geometry')
    const rect = {
      id: 'r',
      type: 'rect' as const,
      x: 0,
      y: 0,
      w: 10,
      h: 4,
      rx: 0,
      fill: '#ff2121',
      stroke: null,
      opacity: 1,
      rotation: 30,
    }
    const center = boundsCenter(shapeBounds(rect))
    const flipped = flipShape(rect, 'h', center)
    // Em torno do próprio centro, o rect volta ao MESMO box; a rotação inverte.
    expect(shapeBounds(flipped)).toEqual(shapeBounds(rect))
    expect(flipped.rotation).toBe(330)

    const line = {
      id: 'l',
      type: 'line' as const,
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 4,
      fill: 'none',
      stroke: { color: '#000000', width: 2 },
      opacity: 1,
      rotation: 0,
    }
    const flippedLine = flipShape(line, 'h', { x: 5, y: 2 })
    if (flippedLine.type !== 'line') throw new Error('linha esperada')
    expect(flippedLine.x1).toBe(10)
    expect(flippedLine.x2).toBe(0)
    expect(flippedLine.y1).toBe(0)
  })
})
