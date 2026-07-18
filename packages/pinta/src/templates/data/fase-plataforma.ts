import { buildPixelTilemap, buildPixelTileset } from '../builders'
import type { PintaTemplate } from '../catalog'
import { CHAO_TILES } from './chao-de-grama'

// 20 × 15 células. Índices: 0 grama · 1 terra · 2 pedra · 3 plataforma(one-way)
// · 4 espinho · 5 arbusto.
const E = '. . . . . . . . . . . . . . . . . . . .'
const CHAO_ROWS = [
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  '. . . . 3 3 3 3 . . . . . . . . . . . .',
  E,
  '. . . . . . . . . . . . 3 3 3 3 . . . .',
  '. . . . . . . . . 4 . . . . . . . . . .',
  '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
  '1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1',
]
const DECO_ROWS = [
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  E,
  '. . 5 . . . . . . . . . . . . . 5 . . .',
  E,
  E,
]

export const fasePlataformaTemplate: PintaTemplate = {
  id: 'fase-plataforma',
  style: 'pixel',
  role: 'tilemap',
  suggestedName: 'fase-plataforma',
  build() {
    const tileset = buildPixelTileset('pecas-da-fase', 16, CHAO_TILES)
    const tilemap = buildPixelTilemap('fase-plataforma', tileset.id, [
      { name: 'Chão', rows: CHAO_ROWS },
      { name: 'Decoração', rows: DECO_ROWS },
    ])
    return { assets: [tileset, tilemap], primaryIndex: 1 }
  },
}
