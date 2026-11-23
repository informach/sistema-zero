import { expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { encodePintaRegionLayers, type PintaRegionCells } from '@sistemazero/core/creations'
import { readPintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { createRegionSceneQueries } from '@sistemazero/core/studio/pinta-scene-query'
import { scene4BudgetFixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { regionVila } from '../testing/regionVila'
import { purePython, runPurePython } from '../testing/runPurePython'
import { pygameSceneModule } from './pygameProject'
import { pythonRegionWorld } from './pythonRegionWorld'
import { pythonSceneBackend } from './pythonSceneBackend'
import { pythonSceneRuntime } from './pythonSceneRuntime'
import { embedPintaRegionImage } from './regionImage'
import { exportPintaRegionScene } from './regionScene'
import { drawScene } from './sceneDrawing'

const size = 8
const rootBounds = { col: -33, row: -32, cols: 10000, rows: 10000 }
const setBounds = { col: -33, row: 37, cols: 2, rows: 2 }
type Cell = [col: number, row: number, value: number]
type Box = [x: number, y: number, width: number, height: number]
type Matrix = [number, number, number, number, number, number]
type Draw = [string, Box, Matrix, number]
function grid(bounds: typeof rootBounds, placements: Cell[]) {
  const chunks = new Map<string, PintaRegionCells['chunks'][number]>()
  for (const [x, y, cell] of placements) {
    const col = Math.floor(x / 32),
      row = Math.floor(y / 32),
      id = [col, row].join(',')
    const chunk = chunks.get(id) ?? { col, row, cells: new Int16Array(1024).fill(-1) }
    chunk.cells[(y - row * 32) * 32 + x - col * 32] = cell
    chunks.set(id, chunk)
  }
  return encodePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, chunks: [...chunks.values()] }],
    bounds,
  )![0]!
}
function picture(first: string) {
  const canvas = createCanvas(size * 3, size),
    ctx = canvas.getContext('2d')
  for (const [i, color] of [first, '#fc5081', '#38fa82'].entries()) {
    ctx.fillStyle = color
    ctx.fillRect(i * size, 0, size, size)
    ctx.fillStyle = '#341262'
    ctx.fillRect(i * size + 1, 2, 3, 2)
  }
  return canvas
}
const cover = picture('#f00').toBuffer('image/png')
function fixture(physics = 'precise') {
  const object = {
    id: 'child',
    name: 'Porta',
    type: 'lugar',
    x: 0,
    y: 0,
    width: 5,
    height: 6,
    properties: {},
  }
  const start = {
    ...object,
    id: 'start',
    x: setBounds.col * size + 3,
    y: setBounds.row * size + 4,
    role: 'start',
    properties: {
      target: { type: 'object', value: 'child' },
      picture: { type: 'asset', value: 'B' },
    },
  }
  const tiles = { kind: 'tiles', id: 'back', name: 'Piso', visible: true, tilesetId: 'A' }
  const cells: Cell[] = Array.from({ length: 8 }, (_, i) => [i - 3, 0, 2 + (i << 12)])
  const base = { ...tiles, cells: grid(rootBounds, [...cells, [-33, -32, 1], [9000, 9000, 0]]) }
  const sheet = {
    id: 'A',
    name: 'Folha',
    image: picture('#3827ca').toDataURL('image/png'),
    columns: 3,
    count: 3,
    solid: [0],
    platform: [1],
    tileProperties: { '0': { blocked: false } },
    animations: {
      '2': [
        { tile: 0, duration: 50 },
        { tile: 1, duration: 50 },
      ],
    },
  }
  return {
    version: 4,
    id: 'vila',
    name: 'Vila',
    physics,
    tileSize: size,
    cols: rootBounds.cols,
    rows: rootBounds.rows,
    origin: { col: rootBounds.col, row: rootBounds.row },
    tilesets: [sheet, { ...sheet, id: 'B', image: picture('#e1ff04').toDataURL('image/png') }],
    resources: [{ id: 'B', sourceId: 'A', capturedAt: 117 }],
    art: [
      {
        id: 'hero',
        image: picture('#feb210').toDataURL('image/png'),
        width: size * 3,
        height: size,
        sprite: {
          frameWidth: size,
          frameHeight: size,
          columns: 3,
          animations: [
            {
              id: 'walk',
              name: 'Andar',
              loop: false,
              frames: [
                { tile: 0, duration: 60 },
                { tile: 2, duration: 80 },
              ],
            },
          ],
        },
      },
    ],
    layers: [
      {
        kind: 'group',
        id: 'group',
        name: 'Grupo',
        visible: true,
        opacity: 0.75,
        offsetX: -2.5,
        parallaxX: 0.5,
        properties: { score: 0 },
      },
      { ...base, parentId: 'group', opacity: 0.5 },
      { ...base, id: 'front', front: true, tilesetId: 'B', offsetY: 4 },
      { ...base, id: 'hidden', visible: false },
      { ...tiles, id: 'walls', collision: true, cells: grid(rootBounds, [[1, 2, 2]]) },
      {
        kind: 'objects',
        id: 'objects',
        name: 'Objetos',
        visible: true,
        objects: [
          {
            ...object,
            id: 'instance',
            setId: 'set',
            x: 22,
            y: 16,
            width: 24,
            height: 16,
            rotation: 37,
            flipX: true,
          },
          {
            ...object,
            id: 'hero1',
            x: -8,
            y: 12,
            width: 13,
            height: 7,
            flipY: true,
            art: { assetId: 'hero', animationId: 'walk' },
          },
          {
            ...object,
            id: 'barrier',
            x: -12,
            y: 27,
            width: 9,
            height: 8,
            rotation: -17,
            shape: 'ellipse',
            ...(physics === 'precise' ? { collision: true } : {}),
          },
        ],
      },
    ],
    sets: [
      {
        id: 'set',
        cols: 2,
        rows: 2,
        origin: { col: setBounds.col, row: setBounds.row },
        layers: [
          {
            ...tiles,
            id: 'inside',
            tilesetId: 'B',
            cells: grid(setBounds, [
              [-33, 37, 0],
              [-32, 37, 1],
              [-32, 38, 4098],
            ]),
          },
          {
            kind: 'objects',
            id: 'markers',
            name: 'Marcas',
            visible: true,
            offsetY: 0.25,
            objects: [
              {
                ...object,
                x: setBounds.col * size - 4,
                y: setBounds.row * size + 4,
                rotation: 19,
                art: { assetId: 'A', tile: 2 },
              },
              start,
            ],
          },
        ],
      },
    ],
  }
}
async function envelope(scene: ReturnType<typeof fixture>, scale = 1) {
  const { png } = await embedPintaRegionImage(cover, JSON.stringify(scene), { scale })
  return Buffer.from(png).toString('base64')
}
const runtime = `${pythonRegionWorld}\n${pythonSceneRuntime}`
const setup = `request=json.load(sys.stdin)
mundo=ler_mundo_png(base64.b64decode(request['png']))
cena=CenaRegional(mundo)`

it.skipIf(!purePython)(
  'opens the real Vila and Cabana snapshots independently and resolves scoped objects, starts and resources',
  async () => {
    const { map, cabana, assets } = regionVila()
    const find = (id: string) => assets.find((a) => a.id === id) ?? null
    const [root, child] = await Promise.all(
      [map, cabana].map((m) => exportPintaRegionScene(m, find, nativeImageOf)),
    )
    const inside = await embedPintaRegionImage(cover, child!.json)
    const world = await embedPintaRegionImage(cover, root!.json, {
      world: {
        version: 1,
        rootId: map.id,
        maps: [
          {
            id: cabana.id,
            name: cabana.name,
            png: `data:image/png;base64,${Buffer.from(inside.png).toString('base64')}`,
          },
        ],
      },
    })
    const actual = await runPurePython(
      runtime,
      `${setup}
result=[]
for id in mundo['maps']:
    scene=CenaRegional(mundo,id)
    objects=[(o['id'],o['name'],o['properties']) for o in scene.objetos()]
    x,y=scene.ponto_inicial()
    drawn=set()
    scene.desenhar(lambda url,*args:drawn.add(url),(160,128),(x-80,y-64))
    assert drawn and drawn.issubset(mundo['images'])
    result.append(dict(id=id,objects=objects,start=[x,y],physics=scene.fisica))
print(json.dumps(result))`,
      { png: Buffer.from(world.png).toString('base64') },
    )
    expect(actual).toEqual(
      [root!, child!].map(({ scene }) => {
        const query = createRegionSceneQueries(scene),
          start = query.spawn()
        return {
          id: scene.id,
          objects: query.objects().map((o) => [o.id, o.name, o.properties]),
          start: [start.x, start.y],
          physics: scene.physics,
        }
      }),
    )
  },
)

it.skipIf(!purePython)(
  'original PNG crops and crop-local matrices reproduce both compositor passes at 2x',
  async () => {
    const fixtureScene = fixture(),
      scene = readPintaRegionScene(JSON.stringify(fixtureScene))!
    const resources = [...scene.tilesets, ...(scene.art ?? [])]
    const images = new Map(
      await Promise.all(resources.map(async (r) => [r.id, await loadImage(r.image)] as const)),
    )
    const views = [
      { camera: [-27, -3], time: 0 },
      { camera: [-27, -3], time: 75 },
      { camera: [2, 5], time: 350 },
      { camera: [-536, -512], time: 150 },
    ]
    const viewport = [138, 112] as const
    const actual = (await runPurePython(
      runtime,
      `${setup}
draws=[]
def draw(url,crop,matrix,opacity):
    assert url in mundo['images'] and all(type(v) is int for v in crop)
    draws.append((url,crop,matrix,opacity))
results=[]
for view in request['views']:
    for front in (False,True):
        draws=[]
        cena.desenhar(draw,request['viewport'],view['camera'],front,view['time'])
        results.append(draws)
print(json.dumps(results))`,
      { png: await envelope(fixtureScene, 2), views, viewport },
    )) as Draw[][]
    let i = 0
    for (const view of views)
      for (const pass of ['back', 'front'] as const) {
        const reference = createCanvas(...viewport),
          result = createCanvas(...viewport)
        const ctx = reference.getContext('2d'),
          out = result.getContext('2d')
        ctx.imageSmoothingEnabled = false
        out.imageSmoothingEnabled = false
        const [x, y] = view.camera as [number, number]
        ctx.translate(-x, -y)
        ctx.scale(2, 2)
        drawScene(
          ctx as unknown as CanvasRenderingContext2D,
          scene,
          images as unknown as Map<string, CanvasImageSource>,
          pass,
          view.time,
          { x: x / 2, y: y / 2 },
        )
        for (const [url, crop, matrix, alpha] of actual[i++]!) {
          const image = images.get(resources.find((r) => r.image === url)!.id)!
          out.setTransform(...matrix)
          out.globalAlpha = alpha
          out.drawImage(image, ...crop, 0, 0, crop[2], crop[3])
        }
        const expected = ctx.getImageData(0, 0, ...viewport).data
        expect(out.getImageData(0, 0, ...viewport).data).toEqual(expected)
      }
    expect(actual[0]!.length).toBeGreaterThan(8)
    expect(actual[1]!.length).toBeGreaterThan(0)
    expect(actual.at(-1)!.length).toBe(1)
  },
)

it.skipIf(!purePython)(
  'a Raylib Camera2D draws in world pixels, culls to what it shows and moves like the pair camera',
  async () => {
    // Same fields as pyray's Camera2D. Inside begin_mode_2d raylib applies GetCameraMatrix2D
    // (rcore.c): screen = rotate(zoom * (world - target)) + offset.
    const actual = await runPurePython(
      runtime,
      `${setup}
class V:
    def __init__(self, x, y):
        self.x, self.y = x, y
class Camera2D:
    def __init__(self, offset, target, rotation, zoom):
        self.offset, self.target = V(*offset), V(*target)
        self.rotation, self.zoom = rotation, zoom
def raylib_matrix(cam):
    a = cam.zoom * math.cos(math.radians(cam.rotation))
    b = cam.zoom * math.sin(math.radians(cam.rotation))
    t, o = cam.target, cam.offset
    return (a, b, -b, a, o.x - a * t.x + b * t.y, o.y - b * t.x - a * t.y)
def passes(camera, viewport, time):
    result = []
    for front in (False, True):
        draws = []
        cena.desenhar(lambda *draw: draws.append(draw), viewport, camera, front, time)
        result.append(draws)
    return result
viewport = (138, 112)
screen = _SceneBox(0, 0, *viewport)
moved = 0
for target in ((-27, -3), (2, 5), (-536, -512), (-290, 37 * 8)):
    for time in (0, 350):
        pair = passes(target, viewport, time)
        camera = Camera2D((0, 0), target, 0, 1)
        view = raylib_matrix(camera)
        for by_pair, by_camera in zip(pair, passes(camera, viewport, time)):
            assert len(by_pair) == len(by_camera), (target, len(by_pair), len(by_camera))
            for (url, crop, m, alpha), (url2, crop2, m2, alpha2) in zip(by_pair, by_camera):
                assert (url, crop, alpha) == (url2, crop2, alpha2)
                assert all(abs(p - q) < 1e-9 for p, q in zip(m, _compose(view, m2))), (m, m2)
            moved += len(by_camera)
def touches_screen(draw):
    # Separating axes: a turned quad can share the screen's bounding box without touching it.
    quad = _quad(_compose(view, draw[2]), 0, 0, *draw[1][2:])
    for polygon in (quad, screen.corners()):
        for (x0, y0), (x1, y1) in zip(polygon, polygon[1:] + polygon[:1]):
            nx, ny = y0 - y1, x1 - x0
            a = [nx * x + ny * y for x, y in quad]
            b = [nx * x + ny * y for x, y in screen.corners()]
            if max(a) <= min(b) or max(b) <= min(a):
                return False
    return True
turned = 0
for camera in (Camera2D((69, 56), (16, 8), 30, 2), Camera2D((10, 100), (0, 0), -45, 0.5)):
    view = raylib_matrix(camera)
    # A huge screen sees everything the real one sees, from the same view.
    everything = passes(camera, (10**6, 10**6), 150)
    for wide, drawn in zip(everything, passes(camera, viewport, 150)):
        assert set(drawn) <= set(wide)
        visible = [d for d in wide if touches_screen(d)]
        assert set(visible) <= set(drawn), (len(visible), len(drawn))
        turned += len(visible)
print(json.dumps(dict(moved=moved, turned=turned)))`,
      { png: await envelope(fixture(), 2) },
    )
    expect(actual).toEqual({ moved: expect.any(Number), turned: expect.any(Number) })
    const { moved, turned } = actual as { moved: number; turned: number }
    expect(moved).toBeGreaterThan(8)
    expect(turned).toBeGreaterThan(0)
  },
)

it.skipIf(!purePython)(
  'world-space objects, bounds, solids and one-way landings agree with Core on rotated signed sets',
  async () => {
    const scene = fixture(),
      context = createRegionSceneQueries(readPintaRegionScene(JSON.stringify(scene))!)
    const boxes: Box[] = [
      [-33 * size - 1, 0, 3, 3],
      [-33 * size, 0, 3, 3],
    ]
    for (let y = -3; y < 65; y += 3)
      for (let x = -21; x < 50; x += 3) boxes.push([x + 0.125, y + 0.125, 2, 2])
    const body = ([x, y, width, height]: Box) => ({ x, y, width, height })
    const pairs = boxes
      .filter((_, i) => i % 5 === 0)
      .flatMap((b) =>
        [1, -1, 0].map((g) => ({
          before: b,
          after: [b[0], b[1] + 11 * g, b[2], b[3]] as Box,
          g,
        })),
      )
    const doubled = (b: number[]) => b.map((v) => v * 2)
    const values = (await runPurePython(
      runtime,
      `${setup}
start=cena.objeto_por_id('instance/start')
altered=cena.objeto_por_id('instance/start')
altered['properties']['target']['value']='changed'
assert cena.objeto_por_id('instance/start')['properties']['target']['value']=='instance/child'
assert cena.recurso_imagem(cena.propriedade(start,'picture'))!=cena.recurso_imagem('A')
print(json.dumps(dict(spawn=cena.ponto_inicial(),bounds=cena.limites,objects=[o['id'] for o in cena.objetos()],
    property=cena.propriedade(start,'target'),layer=cena.propriedade_camada('group','score'),
    tile=cena.propriedade_peca('A',0,'blocked'),invalid=cena.propriedade_peca('A',True,'blocked'),
    image=cena.recurso_imagem('B') in mundo['images'],
    hits=[cena.bloqueado(b) for b in request['boxes']],
    land=[cena.pouso(a,b,g) for a,b,g in request['pairs']])))`,
      {
        png: await envelope(scene, 2),
        boxes: boxes.map(doubled),
        pairs: pairs.map((p) => [doubled(p.before), doubled(p.after), p.g]),
      },
    )) as {
      spawn: number[]
      bounds: Box
      objects: string[]
      property: string
      layer: number
      tile: boolean
      invalid: null
      image: boolean
      hits: boolean[]
      land: (Box | null)[]
    }
    const spawn = context.spawn()
    expect(values.spawn[0]).toBeCloseTo(spawn.x * 2, 8)
    expect(values.spawn[1]).toBeCloseTo(spawn.y * 2, 8)
    expect(values.bounds).toEqual([-528, -512, 160000, 160000])
    expect(values.objects).toEqual(context.objects().map((o) => o.id))
    expect([values.property, values.layer, values.tile, values.invalid, values.image]).toEqual([
      'instance/child',
      0,
      false,
      null,
      true,
    ])
    expect(values.hits).toEqual(boxes.map((b) => context.intersectsBox(body(b))))
    expect(values.land.some(Boolean)).toBe(true)

    for (const [i, p] of pairs.entries()) {
      const landing = context.platformLanding(body(p.before), body(p.after), p.g)
      if (!landing) expect(values.land[i]).toBeNull()
      else expect(values.land[i]![1]).toBeCloseTo(landing.y * 2, 7)
    }
  },
)

it.skipIf(!purePython)(
  'bloqueado and pouso read a Raylib Rectangle by its fields, like the (x, y, w, h) tuple',
  async () => {
    const boxes: Box[] = []
    for (let y = -3; y < 65; y += 3)
      for (let x = -21; x < 50; x += 3) boxes.push([2 * x + 0.25, 2 * y + 0.25, 4, 4])
    const values = (await runPurePython(
      runtime,
      `${setup}
class Rectangle:
    # Like pyray's struct (and the Studio's Raylib): fields to read, nothing to unpack.
    __slots__ = ('x', 'y', 'width', 'height')
    def __init__(self, x, y, width, height):
        self.x, self.y, self.width, self.height = x, y, width, height
    def __iter__(self):
        raise TypeError("cdata 'Rectangle' does not support iteration")
kinds = [Rectangle]
try:
    import cffi
except ImportError:
    pass
else:
    ffi = cffi.FFI()
    ffi.cdef('typedef struct Rectangle { float x; float y; float width; float height; } Rectangle;')
    kinds.append(lambda *fields: ffi.new('Rectangle *', fields)[0])
boxes = [tuple(b) for b in request['boxes']]
hits = [cena.bloqueado(b) for b in boxes]
pairs = [(b, (b[0], b[1] + 22 * g, b[2], b[3]), g) for b in boxes[::5] for g in (1, -1)]
land = [cena.pouso(a, b, g) for a, b, g in pairs]
for kind in kinds:
    assert [cena.bloqueado(kind(*b)) for b in boxes] == hits
    assert [cena.pouso(kind(*a), kind(*b), g) for a, b, g in pairs] == land
print(json.dumps(dict(kinds=len(kinds), hits=sum(hits), free=len(hits) - sum(hits),
                      land=sum(1 for l in land if l))))`,
      { png: await envelope(fixture(), 2), boxes },
    )) as { kinds: number; hits: number; free: number; land: number }
    expect(values.kinds).toBeGreaterThan(0)
    expect(values.hits).toBeGreaterThan(0)
    expect(values.free).toBeGreaterThan(0)
    expect(values.land).toBeGreaterThan(0)
  },
)

it.skipIf(!purePython)(
  'limits inverse cell windows before asking the regional reader and keeps off-screen storage cold',
  async () => {
    const source = fixture('legacy')
    const result = (await runPurePython(
      runtime,
      `${setup}
calls=[]
original=CelulasRegionais.occupied
def visit(self,rect,row_major=False):
    calls.append(rect)
    yield from original(self,rect,row_major)
CelulasRegionais.occupied=visit
draws=[]
cena.desenhar(lambda *args: draws.append(args),(36,28),(9000*8,9000*8+4),True)
assert len(draws)==1
assert cena.bloqueado((9000*8,9000*8+5,2,2))
assert cena.pouso((0,0,4,4),(0,12,4,4)) is None
x,y,w,h=cena.limites
for outside in ((x-0.25,y,1,1),(x,y-0.25,1,1),(x+w-0.75,y,1,1),(x,y+h-0.75,1,1)):
    assert cena.bloqueado(outside)
for inside in ((x,y,1,1),(x+w-1,y+h-1,1,1)):
    assert not cena.bloqueado(inside)
print(json.dumps(calls))`,
      { png: await envelope(source) },
    )) as { col: number; row: number; cols: number; rows: number }[]
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.cols <= 7 && r.rows <= 6)).toBe(true)
    expect(result.some((r) => r.col >= 8998 && r.row >= 8998)).toBe(true)
  },
)

it.skipIf(!purePython)(
  'renders and queries the 32-layer, 4-MiB scene without allocating a dense map or expanded colliders',
  async () => {
    const { art: _art, resources: _resources, ...source } = scene4BudgetFixture()
    const tilesets = source.tilesets.map((t) => ({
      ...t,
      image: createCanvas(64, 16).toDataURL('image/png'),
    }))
    const { png } = await embedPintaRegionImage(
      cover,
      JSON.stringify({ ...source, physics: 'legacy', tilesets }),
    )
    const result = (await runPurePython(
      runtime,
      `import tracemalloc
request=json.load(sys.stdin)
world=ler_mundo_png(base64.b64decode(request))
count=0
def draw(*args):
    global count
    count+=1
# Measure only the runtime over the already admitted immutable storage.
tracemalloc.start()
scene=CenaRegional(world)
scene.desenhar(draw,(16,16))
assert scene.bloqueado((2,3,1,1)) and not scene.bloqueado((80000,80000,1,1))
scene.desenhar(draw,(16,16),camera=(80000,80000))
print(json.dumps([count,tracemalloc.get_traced_memory()[1],scene.ponto_inicial()]))`,
      Buffer.from(png).toString('base64'),
    )) as [number, number, [number, number]]
    expect(result[0]).toBe(32)
    expect(result[1]).toBeLessThan(2 * 1024 * 1024)
    expect(result[2]).toEqual([8, 8])
  },
  20000,
)

const pygamePython =
  purePython && spawnSync(purePython, ['-I', '-c', 'import pygame']).status === 0
    ? purePython
    : undefined
it.skipIf(!pygamePython)(
  'published Pygame scenes 2 and 3 match the regional policy for native tile pixels, walls and one-way platforms',
  async () => {
    const sheet = fixture().tilesets[0]!
    const bounds = { col: 0, row: 0, cols: 8, rows: 4 }
    const placements: Cell[] = Array.from({ length: 8 }, (_, i) => [i, 0, (i << 12) + 2])
    placements.push([2, 2, 0], [4, 2, 1])
    const cells = Array<number>(bounds.cols * bounds.rows).fill(-1)
    for (const [x, y, v] of placements) cells[y * bounds.cols + x] = v
    const layer = {
      id: 'ground',
      name: 'Chão',
      kind: 'tiles',
      visible: true,
      tilesetId: 'A',
      cells,
    }
    const dense = {
      id: 'map',
      name: 'map',
      tileSize: size,
      cols: 8,
      rows: 4,
      tilesets: [sheet],
      layers: [layer],
    }
    const samples = []
    for (const [version, physics] of [
      [2, 'legacy'],
      [3, 'precise'],
    ] as const) {
      const scene = {
        ...dense,
        version: 4,
        physics,
        origin: { col: 0, row: 0 },
        layers: [{ ...layer, cells: grid(bounds, placements) }],
      }
      const { png } = await embedPintaRegionImage(cover, JSON.stringify(scene))
      samples.push({ dense: { ...dense, version }, png: Buffer.from(png).toString('base64') })
    }
    const facadePath = fileURLToPath(
      new URL('../../../studio/src/runtime/python/pygame/py/pinta.py', import.meta.url),
    )
    const script = `import io,base64,json,runpy
${pygameSceneModule}
${runtime}
Mapa=runpy.run_path(facade_path)['Mapa']
for sample in samples:
    old=Mundo.__new__(Mundo)
    old.mapas={'map':sample['dense']}
    old.pecas={}
    mondo=ler_mundo_png(base64.b64decode(sample['png']))
    cena=CenaRegional(mondo)
    textures={url:pygame.image.load(io.BytesIO(record['png'])) for url,record in mondo['images'].items()}
    old.imagem=textures.__getitem__
    old.carregar('map')
    published=Mapa.__new__(Mapa)
    published.colunas,published.linhas,published.tamanho_peca=8,4,8
    published._cena=old
    outside=(-0.25,12,1,1)
    assert published.bloqueado(outside) and cena.bloqueado(outside)
    assert old.bloqueado(pygame.FRect(outside))==(sample['dense']['version']>=3)
    old.inicio_animacao=0
    for time in (0,50,100):
        pygame.time.get_ticks=lambda: time
        reference=pygame.Surface((64,32),pygame.SRCALPHA)
        old.desenhar(reference,camera=(0,0),personagem=False)
        output=pygame.Surface((64,32),pygame.SRCALPHA)
        # Inverse nearest-neighbor sample at pixel centers; includes transposition and reflection.
        def draw(url,crop,matrix,alpha):
            a,b,c,d,e,f=matrix
            det=a*d-b*c
            sx,sy,w,h=crop
            assert alpha==1
            for y in range(32):
                for x in range(64):
                    dx,dy=x+0.5-e,y+0.5-f
                    u,v=(d*dx-c*dy)/det,(-b*dx+a*dy)/det
                    if 0<=u<w and 0<=v<h:
                        output.set_at((x,y),textures[url].get_at((sx+math.floor(u),sy+math.floor(v))))
        cena.desenhar(draw,(64,32),tempo=time)
        assert pygame.image.tobytes(reference,'RGBA')==pygame.image.tobytes(output,'RGBA')
    for y in range(30):
        for x in range(62):
            box=(x,y,2,2)
            assert old.bloqueado(pygame.FRect(box))==cena.bloqueado(box)
    for g in (1,-1,0):
        for y in range(0,27):
            for x in range(0,60,4):
                before=(x,y,2,2)
                after=(x,y+5*g,2,2)
                original=old.pouso(before,after,g)
                new=cena.pouso(before,after,g)
                assert (None if original is None else tuple(original))==new
print('ok')
`
    const check = spawnSync(
      pygamePython!,
      ['-I', '-c', 'import sys,json; source,samples,facade_path=json.load(sys.stdin);exec(source)'],
      {
        input: JSON.stringify([script, samples, facadePath]),
        encoding: 'utf8',
        timeout: 60000,
        env: { ...process.env, PYGAME_HIDE_SUPPORT_PROMPT: '1', SDL_VIDEODRIVER: 'dummy' },
      },
    )
    expect(check.status, check.stderr || check.error?.message).toBe(0)
    expect(check.stdout.trim()).toBe('ok')
  },
)

it.skipIf(!purePython)(
  'a door to a place missing from the world warns once and opens nothing, like the JS map',
  async () => {
    const { map, cabana, assets } = regionVila()
    const find = (id: string) => assets.find((a) => a.id === id) ?? null
    const [root, child] = await Promise.all(
      [map, cabana].map((m) => exportPintaRegionScene(m, find, nativeImageOf)),
    )
    const inside = await embedPintaRegionImage(cover, child!.json)
    const world = await embedPintaRegionImage(cover, root!.json, {
      world: {
        version: 1,
        rootId: map.id,
        maps: [
          {
            id: cabana.id,
            name: cabana.name,
            png: `data:image/png;base64,${Buffer.from(inside.png).toString('base64')}`,
          },
        ],
      },
    })
    const actual = await runPurePython(
      `${runtime}
${pythonSceneBackend}`,
      `import base64, contextlib, io
request=json.load(sys.stdin)
class Renderer:
    def descartar(self):
        pass
class Lugar(_PintaSceneBackend):
    _criar_renderizador = staticmethod(lambda images: Renderer())
game = Lugar(base64.b64decode(request['png']))
door = game.objeto_por_id('door')
avisos = io.StringIO()
opened = []
with contextlib.redirect_stderr(avisos):
    for destino in ({'type': 'string', 'value': 'Floresta'}, {'type': 'asset', 'value': 'floresta'},
                    {'type': 'string', 'value': 'Floresta'}):
        porta = dict(door, properties=dict(door['properties'], destino=destino))
        opened.append(game.abrir_destino(porta))
with game.abrir_destino(door) as outro:
    found = outro.cena.mapa_id
print(json.dumps(dict(opened=opened, avisos=avisos.getvalue().splitlines(), found=found)))`,
      { png: Buffer.from(world.png).toString('base64') },
    )
    expect(actual).toEqual({
      opened: [null, null, null],
      avisos: [
        'Aviso: o destino desta porta não faz parte do mundo carregado: Floresta',
        'Aviso: o destino desta porta não faz parte do mundo carregado: floresta',
      ],
      found: cabana.id,
    })
  },
)
