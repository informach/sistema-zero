/**
 * Vampire Survivor: o caçador, os três monstros, a arma e a bala, as árvores, as ruínas e as
 * pedras, o chão (peças) e o mapa "mundo" com as camadas do original. Tudo desenhado com
 * metade do tamanho (×2 no jogo).
 */
import type { Drawing, MapDrawing, TilesetDrawing } from '../drawing'
import { characterDrawings } from './vampire-survivor/characters'
import {
  COLLISIONS,
  COLS,
  ENTITIES,
  GROUND,
  GROUND_KINDS,
  OBJECTS,
  ROWS,
} from './vampire-survivor/maps'
import { objectDrawings } from './vampire-survivor/objects'
import {
  decoration,
  GRASS_VARIANTS,
  SAND_VARIANTS,
  TILE,
  tileFor,
} from './vampire-survivor/terrain'

function world(): { tileset: TilesetDrawing; map: MapDrawing } {
  const base = GROUND_KINDS.map(tileFor)
  const grassAt = base.length
  const sandAt = grassAt + GRASS_VARIANTS.length
  const tileset: TilesetDrawing = {
    kind: 'tileset',
    name: 'terreno',
    tileSize: TILE,
    tiles: [...base, ...GRASS_VARIANTS, ...SAND_VARIANTS].map((image) => ({ image })),
  }
  const plainGrass = GROUND_KINDS.indexOf('gggg')
  const plainSand = GROUND_KINDS.indexOf('ssss')
  const cells = GROUND.map((kind, index) => {
    const x = index % COLS
    const y = Math.floor(index / COLS)
    if (kind === plainGrass) {
      const pick = decoration(x, y, GRASS_VARIANTS.length, 0.16)
      return pick < 0 ? kind : grassAt + pick
    }
    if (kind === plainSand) {
      const pick = decoration(x, y, SAND_VARIANTS.length, 0.08)
      return pick < 0 ? kind : sandAt + pick
    }
    return kind
  })
  return {
    tileset,
    map: {
      kind: 'map',
      name: 'mundo',
      cols: COLS,
      rows: ROWS,
      layers: [
        { type: 'tiles', name: 'Chão', tileset, cells },
        { type: 'objects', name: 'Objetos', objects: OBJECTS },
        { type: 'objects', name: 'Colisões', objects: COLLISIONS, visible: false },
        { type: 'objects', name: 'Entidades', objects: ENTITIES },
      ],
    },
  }
}

export function drawings(): Drawing[] {
  const { tileset, map } = world()
  return [...characterDrawings(), ...objectDrawings(), tileset, map]
}
