/**
 * The eight maps of Python Monsters as Pinta maps. The level design comes from `source-maps.ts`
 * (the original Tiled maps, converted once): every terrain cell becomes the new tile that means
 * the same thing (`terrain.ts`), split into one layer per tileset because a Pinta layer uses one
 * tileset. Objects keep their original layer as the TYPE (the game asks `mapa.objetos('Water')`),
 * so several original layers can share one Pinta object layer and every map fits in 8 layers.
 */
import type { MapDrawing, MapLayer, MapObject, TilesetDrawing } from '../../drawing'
import { SOURCE_MAPS, type SourceMap, type SourceObject } from './source-maps'
import { type TerrainTile, tileFor } from './terrain'

/** Original map → Pinta drawing name (also the `target` of the transitions). */
export const MAP_NAMES: Record<string, string> = {
  world: 'mundo',
  fire: 'fogo',
  plant: 'planta',
  water: 'agua',
  arena: 'arena',
  hospital: 'hospital',
  hospital2: 'hospital-2',
  house: 'casa',
}
/** Where the player arrives from (the `pos` property). */
const ENTRY_NAMES: Record<string, string> = { ...MAP_NAMES, entrance: 'entrada' }

export const CHARACTER_NAMES: Record<string, string> = {
  player: 'jogador',
  blond: 'loira',
  fire_boss: 'chefe-fogo',
  hat_girl: 'menina-chapeu',
  purple_girl: 'menina-roxa',
  straw: 'chapeu-de-palha',
  water_boss: 'chefe-agua',
  young_girl: 'menina',
  young_guy: 'rapaz',
}

/** Original object image → the Pinta drawing (and animation) that draws it. */
export const OBJECT_IMAGES: Record<string, { drawing: string; animation?: string }> = {
  green_tree: { drawing: 'arvores', animation: 'verde' },
  green_tree_bushy: { drawing: 'arvores', animation: 'verde-cheia' },
  teal_tree: { drawing: 'arvores', animation: 'azulada' },
  teal_tree_bushy: { drawing: 'arvores', animation: 'azulada-cheia' },
  ice_tree: { drawing: 'arvores', animation: 'pinheiro-nevado' },
  palm: { drawing: 'arvores', animation: 'palmeira' },
  palm_alt: { drawing: 'arvores', animation: 'palmeira-curva' },
  green_tree_small: { drawing: 'plantas-pequenas', animation: 'arvore-verde' },
  teal_tree_small: { drawing: 'plantas-pequenas', animation: 'arvore-azulada' },
  palm_small: { drawing: 'plantas-pequenas', animation: 'palmeira' },
  ruin_pillar: { drawing: 'ruinas', animation: 'coluna' },
  ruin_pillar_broke: { drawing: 'ruinas', animation: 'coluna-quebrada' },
  ruin_pillar_broke_alt: { drawing: 'ruinas', animation: 'coluna-partida' },
  gate_pillar: { drawing: 'ruinas', animation: 'pilar-do-portao' },
  gate_top: { drawing: 'portao', animation: 'arco' },
  grassrock1: { drawing: 'pedras', animation: 'grama' },
  grassrock2: { drawing: 'pedras', animation: 'grama-2' },
  sandrock1: { drawing: 'pedras', animation: 'areia' },
  sandrock2: { drawing: 'pedras', animation: 'areia-2' },
  icerock1: { drawing: 'pedras', animation: 'gelo' },
  icerock2: { drawing: 'pedras', animation: 'gelo-2' },
  grass: { drawing: 'mato', animation: 'grama' },
  grass_ice: { drawing: 'mato', animation: 'gelo' },
  sand: { drawing: 'mato', animation: 'areia' },
  hospital: { drawing: 'predio-hospital' },
  house_small: { drawing: 'casa-verde' },
  house_small_alt: { drawing: 'casa-roxa' },
  house_large: { drawing: 'casa-grande' },
  arean_fire: { drawing: 'templo-fogo' },
  arena_plant: { drawing: 'templo-planta' },
  arena_water: { drawing: 'templo-agua' },
}

/** Pinta object layers: the original layers each one holds. */
const OBJECT_LAYERS: [string, string[]][] = [
  ['Entidades', ['Entities']],
  ['Objetos', ['Objects']],
  ['Mato', ['Monsters']],
  ['Costa', ['Coast']],
  ['Areas', ['Collisions', 'Transition', 'Water']],
]

// Completed: the arena ---------------------------------------------------------------------------
//
// The original arena map was an unfinished copy of the plant maze: no collisions, people copied
// from the fire map (some inside the walls), trainers t3/t4/t6 that did not exist and no door to
// it. Here it becomes the champions' arena in the desert ruins: the same maze in sand and palms,
// the plant map's walls, three champions on the path, and the old ruin gate of the beach (south
// east of the world) as its entrance, watched by a guard until the three temple bosses fall.

const DESERT_OBJECTS: Record<string, string> = {
  green_tree: 'palm',
  green_tree_bushy: 'palm_alt',
  green_tree_small: 'palm_small',
  grassrock1: 'sandrock1',
  grassrock2: 'sandrock2',
}

function arenaMap(arena: SourceMap, plant: SourceMap): SourceMap {
  // Grass-biome tiles become the same piece of the sand biome (60 tiles later in the original set).
  const desert = (token: string) => {
    if (token === 'w71') return 'w74'
    const id = Number(token.slice(1))
    return token[0] === 'w' && id < 60 ? `w${id + 60}` : token
  }
  const layers = Object.fromEntries(
    Object.entries(arena.layers).map(([name, rows]) => [
      name,
      rows.map((row) => row.split(' ').map(desert).join(' ')),
    ]),
  )
  const person = (
    id: string,
    x: number,
    y: number,
    direction: string,
    graphic: string,
    radius: string,
  ): SourceObject => ({
    layer: 'Entities',
    name: 'Character',
    x,
    y,
    width: 0,
    height: 0,
    properties: { character_id: id, direction, graphic, radius },
  })
  const objects: SourceObject[] = [
    ...arena.objects
      .filter((object) => object.layer === 'Objects')
      .map((object) => ({ ...object, image: DESERT_OBJECTS[object.image ?? ''] ?? object.image })),
    ...plant.objects.filter((object) => object.layer === 'Collisions'),
    ...arena.objects.filter((object) => object.layer === 'Entities' && object.name === 'Player'),
    // The three champions, on the maze path the plant trainers use: the first right after the
    // entrance, the second on the top corridor and the champion by the stairs in the middle.
    person('t3', 852.71, 1451.59, 'down', 'young_guy', '400'),
    person('t4', 578, 420, 'right', 'young_girl', '400'),
    person('t6', 706.86, 761.71, 'down', 'campeao', '0'),
    ...arena.objects
      .filter((object) => object.layer === 'Transition')
      .map((object) => ({ ...object, properties: { pos: 'arena', target: 'world' } })),
  ]
  return { ...arena, layers, objects }
}

/** The entrance in the world: the ruin gate on the beach, its guard and the arrival point. */
const ARENA_GATE: SourceObject[] = [
  {
    layer: 'Transition',
    name: '',
    x: 4364,
    y: 4548,
    width: 76,
    height: 8,
    properties: { pos: 'entrance', target: 'arena' },
  },
  {
    layer: 'Entities',
    name: 'Player',
    x: 4400,
    y: 4690,
    width: 0,
    height: 0,
    properties: { direction: 'down', pos: 'arena' },
  },
  // The guard stands in the gate (fechada) until the three temple bosses are defeated; then he
  // waits beside it (aberta). The game creates the one that matches.
  {
    layer: 'Entities',
    name: 'Character',
    x: 4400,
    y: 4580,
    width: 0,
    height: 0,
    properties: {
      character_id: 'Porteiro',
      direction: 'down',
      graphic: 'guarda',
      radius: '0',
      aberta: false,
    },
  },
  {
    layer: 'Entities',
    name: 'Character',
    x: 4250,
    y: 4700,
    width: 0,
    height: 0,
    properties: {
      character_id: 'Porteiro',
      direction: 'right',
      graphic: 'guarda',
      radius: '0',
      aberta: true,
    },
  },
]

const MAPS: SourceMap[] = SOURCE_MAPS.map((map) => {
  if (map.name === 'arena')
    return arenaMap(map, SOURCE_MAPS.find((source) => source.name === 'plant')!)
  if (map.name === 'world') {
    // The palm just south of the gate stood half in front of the opening: it moves a little to
    // the right so the way into the gate is as wide as the gate.
    const objects = map.objects.map((object) =>
      object.image === 'palm' && object.x === 4424 && object.y === 4626
        ? { ...object, x: 4544 }
        : object,
    )
    return { ...map, objects: [...objects, ...ARENA_GATE] }
  }
  return map
})

const half = (value: number) => Math.round(value / 2)

function convertObject(source: SourceObject, map: SourceMap): MapObject {
  const width = half(source.width)
  const height = half(source.height)
  const limitX = map.cols * 32
  const limitY = map.rows * 32
  let x = Math.max(0, half(source.x))
  let y = Math.max(0, half(source.y))
  const w = Math.max(0, Math.min(width - (x - half(source.x)), limitX - x))
  const h = Math.max(0, Math.min(height - (y - half(source.y)), limitY - y))
  x = Math.min(x, limitX)
  y = Math.min(y, limitY)
  const properties: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(source.properties)) {
    if (key === 'color' || key === 'text_color') continue // editor-only colours in the arena map
    if (key === 'graphic') properties[key] = CHARACTER_NAMES[String(value)] ?? String(value)
    else if (key === 'pos') properties[key] = ENTRY_NAMES[String(value)] ?? String(value)
    else if (key === 'target') properties[key] = MAP_NAMES[String(value)] ?? String(value)
    else properties[key] = value
  }
  // Completed: the nurse of the second hospital had no direction and no radius in the original
  // map, and the game read both (it crashed on entering). She now has the nurse's own values.
  if (source.properties.character_id === 'Nurse') {
    properties.direction ??= 'down'
    properties.radius ??= '0'
  }
  if (source.image) {
    const image = OBJECT_IMAGES[source.image]
    if (!image) throw new Error(`objeto sem desenho: ${source.image}`)
    properties.desenho = image.drawing
    if (image.animation) properties.animacao = image.animation
  }
  return {
    name: source.name,
    type: source.layer,
    x,
    y,
    ...(w || h ? { width: w, height: h } : {}),
    properties,
  }
}

interface TerrainPlan {
  /** tileset name → tile key → tile (insertion order = tile index). */
  tiles: Map<string, Map<string, TerrainTile>>
}

function planTerrain(): TerrainPlan {
  const tiles = new Map<string, Map<string, TerrainTile>>()
  for (const map of MAPS)
    for (const rows of Object.values(map.layers))
      rows.forEach((row, y) => {
        row.split(' ').forEach((token, x) => {
          const tile = tileFor(token, x, y)
          if (!tile || tile.tileset === '*') return
          if (!tiles.has(tile.tileset)) tiles.set(tile.tileset, new Map())
          tiles.get(tile.tileset)!.set(tile.key, tile)
        })
      })
  // The void (around the indoor and the trainers' maps) joins the tileset its cells share a
  // layer with: decided per map below, so each tileset that needs it gets one copy.
  for (const map of MAPS)
    for (const rows of Object.values(map.layers)) {
      const counts = countTilesets(rows)
      if (!counts.has('*')) continue
      const host = majority(counts)
      const tile = tileFor('i43', 0, 0)!
      tiles.get(host)!.set(tile.key, tile)
    }
  return { tiles }
}

function countTilesets(rows: string[]) {
  const counts = new Map<string, number>()
  rows.forEach((row, y) => {
    row.split(' ').forEach((token, x) => {
      const tile = tileFor(token, x, y)
      if (tile) counts.set(tile.tileset, (counts.get(tile.tileset) ?? 0) + 1)
    })
  })
  return counts
}

function majority(counts: Map<string, number>): string {
  let best = ''
  let most = -1
  for (const [name, count] of [...counts].sort())
    if (name !== '*' && count > most) [best, most] = [name, count]
  return best
}

const LAYER_LABEL: Record<string, string> = {
  'terreno-grama': 'grama',
  'terreno-areia': 'areia',
  'terreno-gelo': 'gelo',
  interior: 'interior',
}

export function buildMaps(): { tilesets: TilesetDrawing[]; maps: MapDrawing[] } {
  const plan = planTerrain()
  const tilesets = new Map<string, TilesetDrawing>()
  const indexOf = new Map<string, Map<string, number>>()
  for (const [name, tiles] of plan.tiles) {
    if (tiles.size > 64)
      throw new Error(`O tileset ${name} ficou com ${tiles.size} peças (máximo 64).`)
    tilesets.set(name, {
      kind: 'tileset',
      name,
      tileSize: 32,
      tiles: [...tiles.values()].map((tile) => ({ image: tile.draw() })),
    })
    indexOf.set(name, new Map([...tiles.keys()].map((key, index) => [key, index])))
  }
  const maps = MAPS.map((map): MapDrawing => {
    const layers: MapLayer[] = []
    for (const [original, rows] of Object.entries(map.layers)) {
      const counts = countTilesets(rows)
      const host = majority(counts)
      const names = [...counts.keys()]
        .filter((name) => name !== '*')
        .sort((a, b) => (a === host ? -1 : b === host ? 1 : a.localeCompare(b)))
      for (const name of names) {
        const cells = new Array<number>(map.cols * map.rows).fill(-1)
        const keys = indexOf.get(name)!
        rows.forEach((row, y) => {
          row.split(' ').forEach((token, x) => {
            const tile = tileFor(token, x, y)
            if (!tile) return
            const owner = tile.tileset === '*' ? host : tile.tileset
            if (owner !== name) return
            cells[y * map.cols + x] = keys.get(tile.key)!
          })
        })
        const base = original === 'Terrain' ? 'Terreno' : 'Terreno de cima'
        layers.push({
          type: 'tiles',
          name: names.length > 1 ? `${base} ${LAYER_LABEL[name]}` : base,
          tileset: tilesets.get(name)!,
          cells,
        })
      }
    }
    for (const [name, originals] of OBJECT_LAYERS) {
      const objects = map.objects
        .filter((object) => originals.includes(object.layer))
        .map((object) => convertObject(object, map))
      if (objects.length) layers.push({ type: 'objects', name, objects })
    }
    if (layers.length > 8)
      throw new Error(`O mapa ${map.name} ficou com ${layers.length} camadas (máximo 8).`)
    return { kind: 'map', name: MAP_NAMES[map.name]!, cols: map.cols, rows: map.rows, layers }
  })
  return { tilesets: [...tilesets.values()], maps }
}
