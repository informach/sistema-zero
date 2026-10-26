/**
 * PyDew Valley: the farmer, the trader, trees, crops, soil, rain and icons, plus the farm map
 * split in two Pinta maps (the original Tiled map has 16 layers; a Pinta map holds 8):
 *   `fazenda`        water, ground, grass, decoration, hills, fence, collision and farmable soil
 *   `casa-e-objetos` the house (floor, rugs, walls, furniture) and the object layers
 * Everything is drawn at half size and played at double (32 px pieces = 64 px in the game).
 */
import type { Drawing, MapDrawing, MapObject, TilesetDrawing } from '../drawing'
import { farmer, farmerTools, trader } from './pydew-valley/characters'
import { houseTiles } from './pydew-valley/house'
import * as maps from './pydew-valley/maps'
import {
  crops,
  icons,
  rain,
  soilTiles,
  trees,
  water,
  wetSoilTiles,
  wildPlants,
} from './pydew-valley/objects'
import { decorationTiles, markTiles, terrainTiles } from './pydew-valley/terrain'

function cells(rows: string[]): number[] {
  return rows.flatMap((row) =>
    [...row].map((char) => (char === '.' ? -1 : maps.ALPHABET.indexOf(char))),
  )
}

function tiles(
  name: string,
  tileset: TilesetDrawing,
  rows: string[],
  extra: { visible?: boolean } = {},
) {
  return { type: 'tiles' as const, name, tileset, cells: cells(rows), ...extra }
}

function objects(name: string, items: maps.ObjectData[]) {
  return {
    type: 'objects' as const,
    name,
    objects: items.map((item): MapObject => ({ ...item })),
  }
}

export function drawings(): Drawing[] {
  const terrain = terrainTiles()
  const decoration = decorationTiles()
  const marks = markTiles()
  const house = houseTiles()
  const farm: MapDrawing = {
    kind: 'map',
    name: 'fazenda',
    cols: maps.COLS,
    rows: maps.ROWS,
    layers: [
      tiles('Água', marks, maps.agua, { visible: false }),
      tiles('Chão', terrain, maps.chao),
      tiles('Grama', terrain, maps.grama),
      tiles('Enfeites', decoration, maps.enfeites),
      tiles('Morros', terrain, maps.morros),
      tiles('Cerca', decoration, maps.cerca),
      tiles('Colisão', marks, maps.colisao, { visible: false }),
      tiles('Cultivável', marks, maps.cultivavel, { visible: false }),
    ],
  }
  const houseAndObjects: MapDrawing = {
    kind: 'map',
    name: 'casa-e-objetos',
    cols: maps.COLS,
    rows: maps.ROWS,
    layers: [
      tiles('Piso da casa', house, maps.pisoDaCasa),
      tiles('Móveis de baixo', house, maps.moveisDeBaixo),
      tiles('Paredes', house, maps.paredes),
      tiles('Móveis de cima', house, maps.moveisDeCima),
      objects('Árvores', maps.arvores),
      objects('Enfeites', maps.decoracao),
      objects('Jogador', maps.jogador),
      objects('Objetos', maps.objetos),
    ],
  }
  return [
    farmer(),
    farmerTools(),
    trader(),
    trees(),
    wildPlants(),
    crops(),
    water(),
    rain(),
    icons(),
    soilTiles(),
    wetSoilTiles(),
    farm,
    houseAndObjects,
  ]
}
