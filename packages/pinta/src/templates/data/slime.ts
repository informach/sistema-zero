import { buildPixelSprite } from '../builders'
import type { PintaTemplate } from '../catalog'

// 16×16, verde (7) com olhos pretos (f). 2 quadros = piscar.
const OLHOS = [
  '................',
  '................',
  '................',
  '.....7777.......',
  '...77777777.....',
  '..7777777777....',
  '.777777777777...',
  '.77f7777f7777...',
  '.777777777777...',
  '.777777777777...',
  '.777777777777...',
  '.777777777777...',
  '..7777777777....',
  '...77777777.....',
  '................',
  '................',
]
const PISCA = [
  '................',
  '................',
  '................',
  '.....7777.......',
  '...77777777.....',
  '..7777777777....',
  '.777777777777...',
  '.777777777777...',
  '.777777777777...',
  '.777777777777...',
  '.777777777777...',
  '.777777777777...',
  '..7777777777....',
  '...77777777.....',
  '................',
  '................',
]

export const slimeTemplate: PintaTemplate = {
  id: 'slime',
  style: 'pixel',
  role: 'sprite',
  suggestedName: 'slime',
  build() {
    const sprite = buildPixelSprite('slime', 16, [
      { name: 'parado', fps: 3, frames: [OLHOS, PISCA] },
    ])
    return { assets: [sprite], primaryIndex: 0 }
  },
}
