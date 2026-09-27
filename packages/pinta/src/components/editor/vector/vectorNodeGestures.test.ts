import { describe, expect, it } from 'bun:test'
import { rotatePoint } from '../../../vector/geometry'
import type { VectorShape } from '../../../vector/model'
import { nodeFrameOf, toDocPoint, toLocalPoint } from './vectorNodeGestures'

describe('gestos de nós com âncora de rotação livre', () => {
  it('leva ponteiro e nó pelo pivô explícito, não pelo centro da caixa', () => {
    const shape: VectorShape = {
      id: 'asa',
      type: 'rect',
      x: 20,
      y: 10,
      w: 30,
      h: 10,
      rx: 0,
      fill: '#78dc52',
      stroke: null,
      opacity: 1,
      rotation: 90,
      rotationPivot: { x: 0, y: 0 },
    }
    const local = { x: 20, y: 10 }
    const documentPoint = rotatePoint(local, { x: 0, y: 0 }, 90)
    const frame = nodeFrameOf(shape)

    expect(frame.center).toEqual({ x: 0, y: 0 })
    expect(toDocPoint(frame, local).x).toBeCloseTo(documentPoint.x, 8)
    expect(toDocPoint(frame, local).y).toBeCloseTo(documentPoint.y, 8)
    expect(toLocalPoint(frame, documentPoint).x).toBeCloseTo(local.x, 8)
    expect(toLocalPoint(frame, documentPoint).y).toBeCloseTo(local.y, 8)
  })
})
