import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { encodePintaRegionLayers } from '@sistemazero/core/creations'
import { purePython, runPurePython } from '../testing/runPurePython'
import { pythonRegionWorld } from './pythonRegionWorld'
import { pythonSceneRuntime } from './pythonSceneRuntime'
import { embedPintaRegionImage } from './regionImage'

const runtime = `${pythonRegionWorld}\n${pythonSceneRuntime}`
const size = 8
const large = { col: -64, row: -64, cols: 10000, rows: 10000 }
const definition = { col: -64, row: 32, cols: 2, rows: 2 }
const cover = createCanvas(16, 8).toBuffer('image/png')
const sheet = {
  id: 'sheet',
  name: 'Peças',
  image: `data:image/png;base64,${Buffer.from(cover).toString('base64')}`,
  columns: 2,
  count: 2,
  solid: [0],
  platform: [1],
}

function box(bounds: typeof large) {
  return {
    origin: { col: bounds.col, row: bounds.row },
    cols: bounds.cols,
    rows: bounds.rows,
  }
}

function cell(bounds: typeof large, x: number, y: number, tile: number) {
  const col = Math.floor(x / 32),
    row = Math.floor(y / 32)
  const cells = new Int16Array(1024).fill(-1)
  cells[(y - row * 32) * 32 + x - col * 32] = tile
  const grids = encodePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, chunks: [{ col, row, cells }] }],
    bounds,
  )
  if (!grids?.[0]) throw Error('Grade de prova inválida')
  return grids[0]
}

function layer(id: string, kind: 'objects' | 'group' | 'tiles') {
  return { id, name: id, kind, visible: true }
}

function object(id: string) {
  return { id, name: id, type: '', x: 0, y: 0, width: 16, height: 16, properties: {} }
}

function scene(layers: readonly unknown[], sets: readonly unknown[]) {
  return {
    version: 4,
    id: 'vila',
    name: 'Vila',
    physics: 'precise',
    tileSize: size,
    ...box(large),
    layers,
    sets,
    tilesets: [sheet],
  }
}

async function exercise(source: ReturnType<typeof scene>, program: string) {
  const { png } = await embedPintaRegionImage(cover, JSON.stringify(source))
  return runPurePython(
    runtime,
    `world=ler_mundo_png(base64.b64decode(json.load(sys.stdin)))\n${program}`,
    Buffer.from(png).toString('base64'),
  )
}

test.skipIf(!purePython)(
  'spatial queries discard distant set instances before 512 × 512 child placements or cell visits',
  async () => {
    const far = Array.from({ length: 512 }, (_, i) => ({
      ...object(`instance-${i}`),
      shape: 'set',
      setId: 'far',
      x: 3000 + i / 4,
      y: 4000 + i / 2,
    }))
    const children = Array.from({ length: 512 }, (_, i) => ({
      ...object(`child-${i}`),
      shape: 'art',
      art: { assetId: sheet.id },
      collision: true,
      x: definition.col * size + i / 128,
      y: definition.row * size + i / 256,
      width: 3,
      height: 4,
    }))
    const source = scene(
      [
        { ...layer('instances', 'objects'), objects: far },
        {
          ...layer('sparse-instance', 'objects'),
          objects: [
            { ...object('sparse'), shape: 'set', setId: 'wide', width: 80000, height: 80000 },
          ],
        },
      ],
      [
        {
          id: 'far',
          ...box(definition),
          layers: [{ ...layer('art', 'objects'), objects: children }],
        },
        {
          id: 'wide',
          ...box(large),
          layers: [
            { ...layer('ground', 'tiles'), tilesetId: sheet.id, cells: cell(large, 9000, 9000, 0) },
          ],
        },
      ],
    )
    const result = await exercise(
      source,
      `
calls={'placement':0, 'collider':0, 'cells':0}
placed=_placed
place_child=CenaRegional._set_child
occupied=CelulasRegionais.occupied
def count_placed(*args):
    calls['placement']+=1
    return placed(*args)
def count_child(*args):
    calls['collider']+=1
    return place_child(*args)
def count_cells(*args):
    calls['cells']+=1
    yield from occupied(*args)
_placed=count_placed
CelulasRegionais.occupied=count_cells
scene=CenaRegional(world)
build_cells=calls['cells']
calls['placement']=0
draws=[]
scene.desenhar(lambda *args:draws.append(args),(48,48))
scene.desenhar(lambda *args:draws.append(args),(48,48),frente=True)
assert not draws
draw_placements=calls['placement']
scene._set_child=count_child.__get__(scene,CenaRegional)
solid_candidates=sum(1 for _ in scene._colliders(_SceneBox(20,20,2,2)))
assert scene.pouso((20,20,2,2),(20,40,2,2)) is None
print(json.dumps(dict(calls, build_cells=build_cells, draw_placements=draw_placements,
                      solid_candidates=solid_candidates)))
`,
    )
    expect(result).toMatchObject({ build_cells: 0, collider: 0, cells: 0, solid_candidates: 0 })
    // Per-instance matrix construction may occur even when the children were rejected.
    if (
      !result ||
      typeof result !== 'object' ||
      !('draw_placements' in result) ||
      typeof result.draw_placements !== 'number'
    )
      throw Error('Contagem inválida')
    expect(result.draw_placements).toBeLessThanOrEqual(1026)
  },
  30000,
)

test.skipIf(!purePython)(
  'set culling preserves artwork, platform offsets and authored outlines outside the nominal box',
  async () => {
    const left = definition.col * size,
      top = definition.row * size
    const parent = {
      ...object('instance'),
      x: 72,
      y: 10,
      width: 32,
      rotation: 90,
      flipX: true,
      shape: 'set',
      setId: 'overhang',
    }
    const source = scene(
      [{ ...layer('sets', 'objects'), objects: [parent] }],
      [
        {
          id: 'overhang',
          ...box(definition),
          layers: [
            { ...layer('paint-offset', 'group'), offsetX: 0.5, offsetY: 1.25, opacity: 0.5 },
            {
              ...layer('art', 'objects'),
              parentId: 'paint-offset',
              objects: [
                {
                  ...object('overhanging-art'),
                  shape: 'art',
                  x: left + 1,
                  y: top + 40,
                  width: 8,
                  height: 6,
                  art: { assetId: sheet.id },
                  rotation: 30,
                  flipY: true,
                },
              ],
            },
            { ...layer('offset', 'group'), offsetY: 36 },
            {
              ...layer('platform', 'tiles'),
              parentId: 'offset',
              front: true,
              tilesetId: sheet.id,
              offsetY: 4,
              cells: cell(definition, definition.col, definition.row, 1),
            },
            {
              ...layer('outline', 'objects'),
              opacity: 0,
              objects: [
                {
                  ...object('line'),
                  shape: 'polyline',
                  x: left + 1,
                  y: top + 2,
                  width: 2,
                  height: 2,
                  collision: true,
                  points: [
                    { x: 0, y: 0 },
                    { x: 0, y: 50 },
                  ],
                },
                {
                  ...object('ellipse'),
                  shape: 'ellipse',
                  collision: true,
                  x: left + 2,
                  y: top + 55,
                  width: 8,
                  height: 4,
                  rotation: 30,
                },
              ],
            },
          ],
        },
      ],
    )
    const result = await exercise(
      source,
      `
scene=CenaRegional(world)
inst=scene._sets['overhang']
root_parent=next(scene._root.objects())
nominal=_quad(scene._set_matrix(scene._world_matrix,root_parent,inst),${left},${top},16,16)
assert not _overlaps(nominal,_SceneBox(0,0,48,48))
back,front=[],[]
scene.desenhar(lambda url,crop,matrix,alpha:back.append([crop,alpha]),(48,48))
scene.desenhar(lambda url,crop,matrix,alpha:front.append([crop,alpha]),(48,48),frente=True)
hits=[scene.bloqueado(body) for body in ((30,39,2,2),(30,35,2,2),(13,33,1,1))]
landing=scene.pouso((26,20,2,2),(26,32,2,2))
print(json.dumps(dict(back=back,front=front,hits=hits,landing=landing)))
`,
    )
    expect(result).toEqual({
      back: [[[0, 0, 8, 8], 0.5]],
      front: [[[8, 0, 8, 8], 1]],
      hits: [true, false, true],
      landing: [26, 24, 2, 2],
    })
  },
)

test.skipIf(!purePython)(
  'the broad phase allows a visible child when very large inherited offsets cancel in stage space',
  async () => {
    const big = 2 ** 54
    const source = scene(
      [
        {
          ...layer('sets', 'objects'),
          objects: [{ ...object('instance'), x: -1, shape: 'set', setId: 'cancellation' }],
        },
      ],
      [
        {
          id: 'cancellation',
          ...box({ col: 0, row: 0, cols: 2, rows: 2 }),
          layers: [
            { ...layer('offset', 'group'), offsetX: big },
            {
              ...layer('art', 'objects'),
              parentId: 'offset',
              objects: [
                {
                  ...object('small'),
                  shape: 'art',
                  art: { assetId: sheet.id },
                  x: -big,
                  width: 0.5,
                  height: 1,
                },
              ],
            },
          ],
        },
      ],
    )
    const result = await exercise(
      source,
      `
scene=CenaRegional(world)
drawn=[]
scene.desenhar(lambda url,crop,matrix,alpha:drawn.append(matrix), (4,4))
print(json.dumps(drawn))
`,
    )
    // The stage translation is grouped with the large layer offset in the existing painter.
    expect(result).toEqual([[0.0625, 0, 0, 0.125, 0, 0]])
  },
)
