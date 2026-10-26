/**
 * Super Pirate World: the art of the port, redrawn for Pinta (nothing from the original files).
 * Characters, hazards, items, scenery, tilesets and the seven maps (six stages and the world
 * map) converted from the original level design (see super-pirate-world/maps.ts).
 */
import type { Drawing, MapDrawing, MapLayer } from '../drawing'
import { concha, dente, icone, pirata } from './super-pirate-world/characters'
import { ALPHABET, LEVELS, type MapData, OVERWORLD } from './super-pirate-world/maps'
import { levelPieces, worldPieces } from './super-pirate-world/objects'
import { tilesets } from './super-pirate-world/tiles'

function mapDrawing(data: MapData, sets: ReturnType<typeof tilesets>): MapDrawing {
  const layers: MapLayer[] = []
  for (const [name, info] of Object.entries(data.tiles))
    layers.push({
      type: 'tiles',
      name,
      tileset: sets[info.tileset],
      cells: info.rows.flatMap((row) =>
        [...row].map((char) => (char === '.' ? -1 : ALPHABET.indexOf(char))),
      ),
    })
  for (const [name, objects] of Object.entries(data.objects))
    layers.push({ type: 'objects', name, objects })
  return { kind: 'map', name: data.name, cols: data.cols, rows: data.rows, layers }
}

export function drawings(): Drawing[] {
  const sets = tilesets()
  return [
    pirata(),
    dente(),
    concha(),
    ...levelPieces(),
    icone(),
    ...worldPieces(),
    ...LEVELS.map((level) => mapDrawing(level, sets)),
    mapDrawing(OVERWORLD, sets),
  ]
}
