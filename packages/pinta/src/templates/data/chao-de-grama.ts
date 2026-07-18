import { buildPixelTileset } from '../builders'
import type { PintaTemplate } from '../catalog'

const GRAMA = [
  '7777777777777777',
  '7777777777777777',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
]
const TERRA = Array.from({ length: 16 }, () => 'eeeeeeeeeeeeeeee')
const PEDRA = Array.from({ length: 16 }, () => 'bbbbbbbbbbbbbbbb')
// Plataforma one-way: madeira em cima, VAZIO embaixo (dá para pular por baixo).
const PLATAFORMA = [
  '4444444444444444',
  'eeeeeeeeeeeeeeee',
  'eeeeeeeeeeeeeeee',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]
// Espinho (perigo): bloco preto com pontas.
const ESPINHO = [
  '.f.f.f.f.f.f.f.f',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
  'ffffffffffffffff',
]
// Arbusto decorativo (sem colisão).
const ARBUSTO = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....7777.......',
  '...77777777.....',
  '..7777777777....',
  '..7777777777....',
  '..7777777777....',
  '...77777777.....',
  '....777777......',
  '................',
  '................',
  '................',
  '................',
]

/** Exportado p/ o mapa companheiro reusar a MESMA arte (mesmos índices). */
export const CHAO_TILES = [
  { art: GRAMA, collision: 'solid' as const },
  { art: TERRA, collision: 'solid' as const },
  { art: PEDRA, collision: 'solid' as const },
  { art: PLATAFORMA, collision: 'platform' as const },
  { art: ESPINHO, collision: 'solid' as const },
  { art: ARBUSTO },
]

export const chaoDeGramaTemplate: PintaTemplate = {
  id: 'chao-de-grama',
  style: 'pixel',
  role: 'tileset',
  suggestedName: 'chao-de-grama',
  build() {
    const tileset = buildPixelTileset('chao-de-grama', 16, CHAO_TILES)
    return { assets: [tileset], primaryIndex: 0 }
  },
}
