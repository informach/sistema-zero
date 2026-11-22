import { encodePintaRegionLayers, type PintaRegionCells } from '@sistemazero/core/creations'
import { readPintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { embedPintaRegionImage } from '../../../../../pinta/src/export/regionImage'
import { readPintaRegionImageWorld } from '../../../../../pinta/src/export/regionImageWorld'
import type { AdmittedRegionWorld } from '../regionWire'

type Physics = 'legacy' | 'precise'
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAABbSURBVFiF7ZAxDQAhAMR4VgSggYkddzh4SS8AA4xoQAAv4oYm5Lo3afqsXE4QaH0rekjfkPz5VsmPkn0BHkAH0HgAHUDjAXQAjQfQATQeQAfQeAAdQOMBdADND95CBx2+4Q0JAAAAAElFTkSuQmCC'
export const image = `data:image/png;base64,${PNG}`
const png = Uint8Array.from(atob(PNG), (ch) => ch.charCodeAt(0))
const bounds = { col: -32, row: -32, cols: 10_000, rows: 10_000 }

export function grid(entries: Array<[number, number, number]>, extent = bounds) {
  const chunks = new Map<string, PintaRegionCells['chunks'][number]>()
  for (const [col, row, tile] of entries) {
    const cx = Math.floor(col / 32),
      cy = Math.floor(row / 32)
    const key = [cx, cy].join(',')
    const chunk = chunks.get(key) ?? { col: cx, row: cy, cells: new Int16Array(1024).fill(-1) }
    chunk.cells[(row - cy * 32) * 32 + col - cx * 32] = tile
    chunks.set(key, chunk)
  }
  return encodePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, chunks: [...chunks.values()] }],
    extent,
  )![0]!
}

export function regional(physics: Physics, id = 'vila', x = -508) {
  const floor = [
    [-32, -29, 0],
    [-31, -29, 0],
    [-30, -30, 1],
  ] as [number, number, number][]
  const objects = [
    {
      id: 'start',
      name: 'Início',
      role: 'start',
      type: '',
      shape: 'point',
      x,
      y: -508,
      width: 0,
      height: 0,
      properties: {},
    },
    {
      id: 'door',
      name: 'Porta',
      role: 'door',
      type: '',
      x: -480,
      y: -512,
      width: 16,
      height: 16,
      properties: { destino: { type: 'asset', value: 'cabana' } },
    },
    {
      id: 'area',
      name: 'Área',
      role: 'trigger',
      type: '',
      x: -512,
      y: -512,
      width: 16,
      height: 16,
      properties: { texto: '</script><script>/**' },
    },
    {
      id: 'mini',
      name: 'Piso pequeno',
      type: '',
      x: -464,
      y: -480.25,
      width: 4,
      height: 2,
      shape: 'set',
      setId: 'def',
      properties: {},
    },
    ...(physics === 'precise'
      ? [
          {
            id: 'wall',
            name: 'Parede fina',
            type: '',
            x: -442.5,
            y: -510,
            width: 1,
            height: 24,
            collision: true,
            properties: {},
          },
        ]
      : []),
  ]
  const local = { col: -4, row: 3, cols: 1, rows: 1 }
  return {
    version: 4,
    id,
    name: id === 'vila' ? 'Vila' : 'Cabana',
    physics,
    tileSize: 16,
    cols: bounds.cols,
    rows: bounds.rows,
    origin: { col: bounds.col, row: bounds.row },
    tilesets: [
      {
        id: 'chao',
        name: 'Chão',
        image,
        columns: 4,
        count: 4,
        solid: [0],
        platform: [1],
        tileProperties: { 0: { vida: { type: 'int', value: 0 } } },
        animations: {
          2: [
            { tile: 2, duration: 100 },
            { tile: 3, duration: 100 },
          ],
        },
      },
      { id: 'frente', name: 'Frente', image, columns: 4, count: 4, solid: [], platform: [] },
    ],
    layers: [
      {
        id: 'floor',
        name: 'Chão',
        kind: 'tiles',
        visible: true,
        tilesetId: 'chao',
        properties: { descricao: 'mundo grande' },
        cells: grid([...floor, [-32, -32, 2], [200, 200, 2]]),
      },
      {
        id: 'front',
        name: 'Frente',
        kind: 'tiles',
        visible: true,
        front: true,
        tilesetId: 'frente',
        cells: grid([[-31, -32, 4096 + 3]]),
      },
      { id: 'objects', name: 'Objetos', kind: 'objects', visible: true, objects },
    ],
    sets: [
      {
        id: 'def',
        cols: 1,
        rows: 1,
        origin: { col: local.col, row: local.row },
        layers: [
          {
            id: 'tile',
            name: 'Plataforma',
            kind: 'tiles',
            visible: true,
            tilesetId: 'chao',
            cells: grid([[local.col, local.row, 1]], local),
          },
          {
            id: 'places',
            name: 'Marcadores',
            kind: 'objects',
            visible: true,
            objects: [
              {
                id: 'pin',
                name: 'Marcador',
                type: '',
                shape: 'point',
                x: -60,
                y: 50,
                width: 0,
                height: 0,
                properties: { linked: { type: 'object', value: 'pin' } },
              },
            ],
          },
        ],
      },
    ],
  }
}

export function admit(source: unknown): AdmittedRegionWorld {
  const scene = readPintaRegionScene(JSON.stringify(source))
  if (!scene) throw new Error('Fixture de cena 4 inválida.')
  return { rootId: scene.id, maps: new Map([[scene.id, { data: { scene } }]]) }
}

export function repeatedRegionalObjects() {
  const source = regional('precise')
  const layer = (id: string, objects: unknown[]) => ({
    id,
    name: id,
    kind: 'objects',
    visible: true,
    objects,
  })
  const obj = (id: string, x: number, y: number) => ({
    id,
    name: id,
    type: '',
    x,
    y,
    width: 8,
    height: 8,
    properties: {},
  })
  return {
    ...source,
    layers: [
      layer('first', [
        { ...obj('start', -508, -508), role: 'start' },
        { ...obj('door', -480, -512), role: 'door' },
        { ...obj('area', -512, -512), role: 'trigger' },
        {
          ...obj('spill', -400, -496),
          width: 16,
          height: 16,
          rotation: 90,
          shape: 'set',
          setId: 'spill-def',
        },
      ]),
      layer(
        'far',
        Array.from({ length: 512 }, (_, i) => ({
          ...obj(`copy-${i}`, 10_000 + i * 32, 10_000),
          width: 16,
          height: 16,
          shape: 'set',
          setId: 'many-def',
        })),
      ),
    ],
    sets: [
      {
        id: 'many-def',
        origin: { col: 0, row: 0 },
        cols: 1,
        rows: 1,
        layers: [
          layer(
            'many-points',
            Array.from({ length: 512 }, (_, i) => ({
              ...obj(`point-${i}`, i, i),
              role: 'trigger',
            })),
          ),
        ],
      },
      {
        id: 'spill-def',
        origin: { col: -1, row: 0 },
        cols: 1,
        rows: 1,
        layers: [layer('spill-points', [{ ...obj('touch', 48, 0), role: 'trigger' }])],
      },
    ],
  }
}

export async function pngWorld(cabinX = -474, atlas = image) {
  const parent = regional('legacy')
  for (const sheet of parent.tilesets) sheet.image = atlas
  const child = await embedPintaRegionImage(
    png,
    JSON.stringify(regional('precise', 'cabana', cabinX)),
    { scale: 2 },
  )
  const captured = await embedPintaRegionImage(png, JSON.stringify(parent), {
    scale: 2,
    world: {
      version: 1,
      rootId: 'vila',
      maps: [
        {
          id: 'cabana',
          name: 'Cabana',
          png: `data:image/png;base64,${Buffer.from(child.png).toString('base64')}`,
        },
      ],
    },
  })
  return readPintaRegionImageWorld(captured.png)
}
