import {
  createBitmap,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
  type TilemapAsset,
  type TilemapLayer,
  type TileTerrain,
} from '../../src/core/project'
import { CELL_FLIP_D, CELL_FLIP_H, makeCell } from '../../src/tiles/cell'
import { createMapObject } from '../../src/tiles/mapObjects'
import { createMapSet } from '../../src/tiles/sets'
export function vilaEFloresta(): { assets: PintaAsset[]; map: TilemapAsset; cabana: TilemapAsset } {
  const now = Date.UTC(2026, 10, 17)
  const land = {
    ...createTilesetAsset({ name: 'terra-e-madeira', tileSize: 16, now }),
    id: 'vila-pecas',
    paletteId: 'custom' as const,
    customPalette: {
      name: 'Vila e floresta',
      colors: [
        '',
        '#315b35',
        '#77ae52',
        '#97c867',
        '#c9b57a',
        '#a18752',
        '#694c38',
        '#b16a4d',
        '#d89469',
        '#eee0b0',
        '#887e73',
        '#3d7899',
        '#6db6c4',
        '#dbecc8',
        '#e3b841',
        '#1d3230',
      ],
    },
  }
  land.tiles = Array.from({ length: 16 }, (_, tile) => {
    const b = createBitmap(16, 16)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const u = x / 15,
          v = y / 15,
          grass =
            ((tile >> 3) & 1) * (1 - u) * (1 - v) +
            (tile & 1) * u * (1 - v) +
            ((tile >> 1) & 1) * u * v +
            ((tile >> 2) & 1) * (1 - u) * v
        b.data[y * 16 + x] =
          grass >= 0.45
            ? (x * 17 + y * 37) % 31 === 0
              ? 3
              : 2
            : (x * 17 + y * 37) % 29 === 0
              ? 5
              : 4
      }
    return b
  })
  for (let tile = 16; tile <= 27; tile++) {
    const b = createBitmap(16, 16)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let color = 0
        if (tile === 16) color = (x * 11 + y * 7) % 37 === 0 ? 5 : 4
        if (tile === 17 && (x - 8) ** 2 / 36 + (y - 9) ** 2 / 25 < 1) color = y < 7 ? 13 : 10
        if (tile === 18)
          color = y === 1 || y === 14 ? 5 : x >= 5 && x <= 10 && y >= 4 && y <= 10 ? 15 : 9
        if (tile === 19) color = y % 5 === 0 || x % 8 === 0 ? 8 : 7
        if (tile === 20 && ((x >= 3 && x <= 5) || (y >= 4 && y <= 6) || (y >= 10 && y <= 12)))
          color = x === 3 ? 6 : 5
        if (tile === 21 && x >= 6 && x <= 10) color = x === 6 ? 6 : 5
        if (tile === 22 && (x - 8) ** 2 + (y - 8) ** 2 < 56)
          color = y < 4 ? 3 : x < 4 || y > 11 ? 1 : 2
        if (tile === 23 && (x - 8) ** 2 / 36 + (y - 11) ** 2 / 16 < 1) color = y < 10 ? 3 : 1
        if (tile === 24 && x === 7 && y > 6) color = 1
        if (tile === 24 && (x - 7) ** 2 + (y - 6) ** 2 < 8) color = x === 7 && y === 6 ? 9 : 14
        if (tile === 25 && (x - 8) ** 2 / 49 + (y - 11) ** 2 / 9 < 1) color = 15
        if (tile === 26) color = y % 5 === 0 ? 6 : 5
        if (tile === 27) color = x % 8 === 0 || y % 8 === 0 ? 6 : 5
        b.data[y * 16 + x] = color
      }
    land.tiles.push(b)
  }
  land.solid = land.tiles.map((_, i) => [17, 18, 20, 21].includes(i))
  land.platform = land.tiles.map(() => false)
  const terrain: TileTerrain = {
    id: 'grama',
    name: 'Grama',
    mode: 'corner',
    colors: ['#62b447'],
    tiles: {},
  }
  for (let tile = 0; tile < 16; tile++)
    terrain.tiles[String(tile)] = [
      0,
      (tile >> 0) & 1,
      0,
      (tile >> 1) & 1,
      0,
      (tile >> 2) & 1,
      0,
      (tile >> 3) & 1,
    ]
  land.terrains = [terrain]
  land.tileProperties = { '0': { terreno: 'grama', atrito: { type: 'float', value: 0.8 } } }
  const water = {
    ...createTilesetAsset({ name: 'agua', tileSize: 16, now }),
    id: 'agua-pecas',
    paletteId: land.paletteId,
    customPalette: land.customPalette,
  }
  water.tiles = [createBitmap(16, 16), createBitmap(16, 16)]
  for (const [frame, b] of water.tiles.entries())
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++)
        b.data[y * 16 + x] = (y + frame * 2) % 7 === 0 && (x + frame * 3) % 11 < 6 ? 12 : 11
  water.solid = [false, false]
  water.platform = [false, false]
  water.animations = {
    '0': [
      { tile: 0, duration: 180 },
      { tile: 1, duration: 220 },
    ],
  }
  const hero = {
    ...createPixelSpriteAsset({ name: 'morador', frameSize: 16, now }),
    id: 'morador',
    paletteId: land.paletteId,
    customPalette: land.customPalette,
  }
  hero.layers[0]!.id = 'morador-camada'
  hero.animations[0]!.id = 'morador-parado'
  const person = hero.animations[0]!.frames[0]![0]!
  for (let y = 2; y < 15; y++)
    for (let x = 5; x <= 10; x++)
      person.data[y * 16 + x] = y < 4 ? 7 : y < 7 ? 9 : y < 12 ? 11 : x < 7 || x > 8 ? 6 : 0
  person.data[5 * 16 + 6] = 15
  person.data[5 * 16 + 9] = 15
  const map = {
    ...createTilemapAsset({ name: 'vila-e-floresta', tilesetId: land.id, cols: 32, rows: 24, now }),
    id: 'vila-e-floresta',
  }
  const layers: TilemapLayer[] = [{ id: 'vila', kind: 'group', name: 'Vila', visible: true }]
  const names = [
    'Chão',
    'Caminhos',
    'Jardins',
    'Água',
    'Pedras',
    'Cercas',
    'Telhados',
    'Árvores',
    'Arbustos',
    'Flores',
    'Lago',
    'Pontes',
    'Troncos',
    'Copas',
    'Sombras',
    'Paredes da vila',
  ]
  for (const [i, name] of names.entries()) {
    const cells = new Int16Array(map.cols * map.rows).fill(-1)
    const put = (x: number, y: number, tile: number, flags = 0): void => {
      if (x >= 0 && y >= 0 && x < map.cols && y < map.rows)
        cells[y * map.cols + x] = makeCell(tile, flags)
    }
    const fill = (x: number, y: number, w: number, h: number, tile: number): void => {
      for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) put(c, r, tile)
    }
    const trees = [
      [2, 11],
      [2, 15],
      [3, 20],
      [7, 21],
      [11, 20],
      [16, 15],
      [20, 15],
      [24, 15],
      [18, 19],
      [22, 20],
      [26, 19],
      [24, 22],
      [28, 22],
      [29, 2],
    ]
    if (i === 0) cells.fill(15)
    if (i === 1) {
      fill(2, 4, 23, 2, 16)
      fill(10, 2, 2, 18, 16)
      fill(2, 17, 23, 2, 16)
    }
    if (i === 2) {
      fill(3, 9, 5, 2, 15)
      fill(13, 6, 3, 2, 15)
    }
    if (i === 3)
      for (let r = 12; r < 17; r++)
        for (let c = 4; c < 10; c++) if ((c - 6.5) ** 2 / 9 + (r - 14) ** 2 / 6 < 1) put(c, r, 0)
    if (i === 4)
      for (const [x, y] of [
        [3, 2],
        [14, 3],
        [26, 6],
        [13, 20],
      ])
        put(x!, y!, 17)
    if (i === 5)
      for (let c = 3; c < 17; c++) if (c !== 10 && c !== 11) put(c, 8, 20, c % 2 ? CELL_FLIP_H : 0)
    if (i === 6) {
      fill(5, 2, 4, 2, 19)
      fill(18, 7, 5, 2, 19)
    }
    if (i === 7) for (const [x, y] of trees) put(x!, y!, 21)
    if (i === 8)
      for (const [x, y] of [
        [1, 8],
        [12, 12],
        [15, 10],
        [26, 13],
        [27, 16],
      ])
        put(x!, y!, 23, CELL_FLIP_D)
    if (i === 9)
      for (const [x, y] of [
        [3, 7],
        [4, 7],
        [13, 6],
        [14, 7],
        [15, 6],
        [12, 16],
        [14, 16],
      ])
        put(x!, y!, 24)
    if (i === 10)
      for (let r = 3; r < 22; r++) for (let c = 28 + (r % 7 < 3 ? 0 : -1); c < 32; c++) put(c, r, 0)
    if (i === 11) fill(26, 10, 6, 2, 26)
    if (i === 12) {
      put(5, 20, 21, CELL_FLIP_D)
      put(6, 20, 21, CELL_FLIP_D)
    }
    if (i === 13)
      for (const [x, y] of trees) {
        put(x!, y! - 1, 22)
        put(x!, y! - 2, 22)
      }
    if (i === 14) for (const [x, y] of trees) put(x!, y!, 25)
    if (i === 15) {
      fill(5, 4, 4, 3, 18)
      put(6, 6, 16)
      fill(18, 9, 5, 3, 18)
      put(20, 11, 16)
    }
    layers.push({
      id: `layer-${i}`,
      name,
      visible: true,
      ...(i < 7 ? { parentId: 'vila' } : {}),
      cells,
      ...(i === 3 || i === 10 ? { tilesetId: water.id } : {}),
      ...(i === 6 || i === 13 ? { front: true } : {}),
      ...(i === 14 ? { opacity: 0.35, offsetX: 2, parallaxX: 0.8 } : {}),
    })
  }
  layers.push({
    id: 'roles',
    kind: 'objects',
    name: 'Lugares',
    visible: true,
    objects: [
      createMapObject({ id: 'start', name: 'Início', shape: 'point', role: 'start', x: 32, y: 32 }),
      createMapObject({
        id: 'door',
        name: 'Porta da cabana',
        shape: 'rect',
        role: 'door',
        x: 96,
        y: 96,
        width: 16,
        height: 16,
        properties: { destino: 'cabana', chave: { type: 'int', value: 1 } },
      }),
      createMapObject({
        id: 'danger',
        name: 'Lago perigoso',
        shape: 'ellipse',
        role: 'danger',
        x: 64,
        y: 192,
        width: 96,
        height: 80,
        rotation: 0,
        properties: { cor: { type: 'color', value: '#20a0ff' } },
      }),
      createMapObject({
        id: 'path',
        name: 'Caminho do morador',
        shape: 'polyline',
        role: 'path',
        x: 32,
        y: 64,
        points: [
          { x: 0, y: 0 },
          { x: 64, y: 0 },
          { x: 64, y: 32 },
        ],
        width: 64,
        height: 32,
      }),
      createMapObject({
        id: 'morador-obj',
        name: 'Morador',
        shape: 'art',
        role: 'enemy',
        art: { assetId: hero.id },
        x: 96,
        y: 32,
        width: 16,
        height: 16,
        properties: { vida: { type: 'int', value: 5 }, porta: { type: 'object', value: 'door' } },
      }),
    ],
  })
  map.layers = layers
  const set = createMapSet(map, { col: 13, row: 6, cols: 2, rows: 2 }, 16, 'pedaco-da-vila')
  set.id = 'pedaco-da-vila'
  set.createdAt = now
  set.updatedAt = now
  set.map.id = 'pedaco-da-vila-mapa'
  const setLayerIds = new Map(set.map.layers.map((l, i) => [l.id, `pedaco-camada-${i}`]))
  set.map.layers = set.map.layers.map((l) => ({
    ...l,
    id: setLayerIds.get(l.id)!,
    ...(l.parentId ? { parentId: setLayerIds.get(l.parentId) } : {}),
  }))
  const owner = map.layers.at(-1)!
  if (owner.kind === 'objects')
    owner.objects.push(
      createMapObject({
        id: 'instance',
        name: 'Conjunto vinculado',
        shape: 'set',
        setId: set.id,
        x: 240,
        y: 144,
        width: 32,
        height: 32,
      }),
    )
  const cabana = {
    ...createTilemapAsset({ name: 'cabana', tilesetId: land.id, cols: 8, rows: 8, now }),
    id: 'cabana',
  }
  cabana.layers[0]!.id = 'cabana-chao'
  if ('cells' in cabana.layers[0]!) cabana.layers[0]!.cells!.fill(27)
  cabana.layers.push({
    id: 'inside',
    kind: 'objects',
    name: 'Lugares',
    visible: true,
    objects: [
      createMapObject({ id: 'cabana-inicio', name: 'Entrada', role: 'start', x: 32, y: 32 }),
      createMapObject({
        name: 'Voltar à vila',
        id: 'cabana-saida',
        shape: 'rect',
        role: 'door',
        x: 80,
        y: 32,
        width: 16,
        height: 32,
        properties: { destino: map.name },
      }),
    ],
  })
  return { map, cabana, assets: [land, water, hero, set, map, cabana] }
}
