/**
 * Python Monsters: the overworld (tilesets, eight maps, trees, buildings, sea and coasts), the
 * people, the sixteen monsters and the battle art, drawn at half size (×2 in the game).
 */
import type { Drawing } from '../drawing'
import { battleDrawings } from './python-monsters/battle'
import { peopleDrawings } from './python-monsters/characters'
import { buildMaps } from './python-monsters/maps'
import { monsterDrawings } from './python-monsters/monsters'
import { objectDrawings } from './python-monsters/objects'

export function drawings(): Drawing[] {
  const { maps } = buildMaps()
  return [
    ...peopleDrawings(),
    ...monsterDrawings(),
    ...battleDrawings(),
    ...objectDrawings(),
    ...maps,
  ]
}
