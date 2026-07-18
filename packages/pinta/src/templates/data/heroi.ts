import { buildPixelSprite } from '../builders'
import type { PintaTemplate } from '../catalog'

// 16×16, paleta arcade: 4 laranja(cabelo), d bege(pele), f preto(olhos),
// 8 azul(corpo), c roxo(pernas), e marrom(pés).
const PARADO_A = [
  '................',
  '................',
  '....444444......',
  '...44444444.....',
  '...dd4444dd.....',
  '...dddddddd.....',
  '...dfdddfdd.....',
  '...dddddddd.....',
  '....dddddd......',
  '...8888888888...',
  '..88888888888...',
  '...88888888.....',
  '....cc..cc......',
  '....cc..cc......',
  '....ee..ee......',
  '................',
]
const PARADO_B = [
  '................',
  '................',
  '....444444......',
  '...44444444.....',
  '...dd4444dd.....',
  '...dddddddd.....',
  '...dddddddd.....', // pisca
  '...dddddddd.....',
  '....dddddd......',
  '...8888888888...',
  '..88888888888...',
  '...88888888.....',
  '....cc..cc......',
  '....cc..cc......',
  '....ee..ee......',
  '................',
]
const ANDAR_A = [
  '................',
  '................',
  '....444444......',
  '...44444444.....',
  '...dd4444dd.....',
  '...dddddddd.....',
  '...dfdddfdd.....',
  '...dddddddd.....',
  '....dddddd......',
  '...8888888888...',
  '..88888888888...',
  '...88888888.....',
  '...ccc..cc......',
  '..ccc...cc......',
  '..ee....ee......',
  '................',
]
const ANDAR_B = [
  '................',
  '................',
  '....444444......',
  '...44444444.....',
  '...dd4444dd.....',
  '...dddddddd.....',
  '...dfdddfdd.....',
  '...dddddddd.....',
  '....dddddd......',
  '...8888888888...',
  '..88888888888...',
  '...88888888.....',
  '....cc..ccc.....',
  '....cc...ccc....',
  '....ee....ee....',
  '................',
]

export const heroiTemplate: PintaTemplate = {
  id: 'heroi',
  style: 'pixel',
  role: 'sprite',
  suggestedName: 'heroi',
  build() {
    const sprite = buildPixelSprite('heroi', 16, [
      { name: 'parado', fps: 4, frames: [PARADO_A, PARADO_B] },
      { name: 'andar', fps: 8, frames: [ANDAR_A, ANDAR_B] },
    ])
    return { assets: [sprite], primaryIndex: 0 }
  },
}
