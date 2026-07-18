import { makeEllipse, makeRect } from '../../vector/shapes'
import { buildVectorBackground } from '../builders'
import type { PintaTemplate } from '../catalog'

const SKY = { fill: '#87ceeb', stroke: null, opacity: 1 }
const SUN = { fill: '#fff609', stroke: null, opacity: 1 }
const CLOUD = { fill: '#ffffff', stroke: null, opacity: 1 }

export const ceuComSolTemplate: PintaTemplate = {
  id: 'ceu-com-sol',
  style: 'vector',
  role: 'background',
  suggestedName: 'ceu-com-sol',
  build() {
    const bg = buildVectorBackground('ceu-com-sol', 480, 360, [
      makeRect({ x: 0, y: 0 }, { x: 480, y: 360 }, SKY),
      makeEllipse({ x: 360, y: 40 }, { x: 440, y: 120 }, SUN),
      makeEllipse({ x: 60, y: 80 }, { x: 200, y: 140 }, CLOUD),
      makeEllipse({ x: 250, y: 190 }, { x: 400, y: 250 }, CLOUD),
    ])
    return { assets: [bg], primaryIndex: 0 }
  },
}
