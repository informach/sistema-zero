import type { VectorShape } from '../../vector/model'
import { makeEllipse } from '../../vector/shapes'
import { buildVectorSprite } from '../builders'
import type { PintaTemplate } from '../catalog'

// Fantasma de formas, 32×32: corpo branco + 2 olhos pretos. 2 quadros = flutuar
// (o corpo sobe e desce).
function frame(dy: number): VectorShape[] {
  const white = { fill: '#ffffff', stroke: { color: '#000000', width: 2 }, opacity: 1 }
  const black = { fill: '#000000', stroke: null, opacity: 1 }
  return [
    makeEllipse({ x: 4, y: 6 + dy }, { x: 28, y: 30 + dy }, white),
    makeEllipse({ x: 10, y: 12 + dy }, { x: 15, y: 19 + dy }, black),
    makeEllipse({ x: 18, y: 12 + dy }, { x: 23, y: 19 + dy }, black),
  ]
}

export const fantasminhaTemplate: PintaTemplate = {
  id: 'fantasminha',
  style: 'vector',
  role: 'sprite',
  suggestedName: 'fantasminha',
  build() {
    const sprite = buildVectorSprite('fantasminha', 32, [
      { name: 'flutuar', fps: 4, frames: [frame(2), frame(-2)] },
    ])
    return { assets: [sprite], primaryIndex: 0 }
  },
}
