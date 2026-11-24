import { expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import { encodePintaRegionLayers } from '@sistemazero/core/creations'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { pythonRequiredInCi } from '../testing/ciPython'
import { regionPlatformPng } from '../testing/regionPlatformPng'
import { regionVila } from '../testing/regionVila'
import { pythonPygameAffine } from './pythonPygameAffine'
import { pythonPygameRegional } from './pythonPygameRegional'
import { pythonRegionWorld } from './pythonRegionWorld'
import { pythonSceneBackend } from './pythonSceneBackend'
import { pythonSceneRuntime } from './pythonSceneRuntime'
import { embedPintaRegionImage } from './regionImage'
import { exportPintaRegionScene } from './regionScene'

const python = pythonRequiredInCi(
  [process.env.PYTHON, 'python3', 'python'].find(
    (name) => name && spawnSync(name, ['-I', '-c', 'import pygame']).status === 0,
  ),
)
const source = [
  pythonRegionWorld,
  pythonSceneRuntime,
  pythonSceneBackend,
  pythonPygameAffine,
  pythonPygameRegional,
].join('\n')
const cache = resolve(import.meta.dir, '../../../../.cache')
async function run(body: string, data: unknown): Promise<unknown> {
  await mkdir(cache, { recursive: true })
  const directory = await mkdtemp(join(cache, 'pinta-ce-regional-'))
  if (dirname(directory) !== cache || !basename(directory).startsWith('pinta-ce-regional-'))
    throw Error('Unexpected Python test directory')
  try {
    const file = join(directory, 'check.py')
    await writeFile(
      file,
      `import sys,json,base64,hashlib\nsys.stdin.reconfigure(encoding='utf-8')\n${source}\n${body}`,
    )
    const result = spawnSync(python!, ['-I', file], {
      input: JSON.stringify(data),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        PYGAME_HIDE_SUPPORT_PROMPT: '1',
        SDL_VIDEODRIVER: 'dummy',
        SDL_AUDIODRIVER: 'dummy',
      },
      maxBuffer: 4 * 1024 * 1024,
    })
    expect(result.status, result.stderr || result.error?.message).toBe(0)
    return JSON.parse(result.stdout)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
function cover() {
  const image = createCanvas(32, 16),
    ctx = image.getContext('2d')
  ctx.fillStyle = '#ff0000'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#00ff00'
  ctx.fillRect(16, 0, 16, 16)
  return new Uint8Array(image.toBuffer('image/png'))
}
const url = (bytes: Uint8Array) => `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`

it.skipIf(!python)(
  'a first-door query stays lazy with more than 26 million reusable placed children',
  async () => {
    const object = (id: string, role?: 'door') => ({
      id,
      name: id,
      type: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      properties: {},
      ...(role ? { role } : {}),
    })
    const childLayers = Array.from({ length: 10 }, (_, layer) => ({
      id: `children-${layer}`,
      kind: 'objects',
      name: 'Children',
      visible: true,
      objects: Array.from({ length: 512 }, (_, index) => object(`child-${layer}-${index}`)),
    }))
    const layers = Array.from({ length: 10 }, (_, layer) => ({
      id: `instances-${layer}`,
      kind: 'objects',
      name: 'Instances',
      visible: true,
      objects: Array.from({ length: 512 }, (_, index) => ({
        ...object(`instance-${layer}-${index}`),
        width: 16,
        height: 16,
        setId: 'forest',
      })),
    }))
    layers[0]!.objects[0] = { ...layers[0]!.objects[0]!, role: 'door' }
    const scene = {
      version: 4,
      id: 'large-set',
      name: 'Large set',
      physics: 'precise',
      tileSize: 16,
      origin: { col: 0, row: 0 },
      cols: 10000,
      rows: 10000,
      tilesets: [
        {
          id: 'sheet',
          name: 'Sheet',
          image: url(cover()),
          columns: 2,
          count: 2,
          solid: [],
          platform: [],
        },
      ],
      layers,
      sets: [{ id: 'forest', origin: { col: 0, row: 0 }, cols: 1, rows: 1, layers: childLayers }],
    }
    const { png } = await embedPintaRegionImage(cover(), JSON.stringify(scene))
    expect(
      await run(
        `game=CenarioRegionalPygame(base64.b64decode(json.load(sys.stdin)))
calls=0
original=game.cena._scaled_object
def watched(obj):
    global calls
    calls+=1
    if calls>8:
        raise AssertionError('Expanded repeated objects before the first result')
    return original(obj)
game.cena._scaled_object=watched
objects=game.objetos()
assert calls==0
first=next(objects)
assert first['role']=='door' and calls==1
game.descartar()
print(json.dumps({'expandedCandidates':calls,'firstDoor':True}))`,
        Buffer.from(png).toString('base64'),
      ),
    ).toEqual({ expandedCandidates: 1, firstDoor: true })
  },
)

it.skipIf(!python)(
  'pygame-ce keeps fractional distant platforms supporting float32 bodies over repeated frames and inverted gravity',
  async () => {
    const cases = await Promise.all(
      ([1, -1] as const).map(async (direction) => ({
        direction,
        png: Buffer.from(await regionPlatformPng(direction)).toString('base64'),
      })),
    )
    expect(
      await run(
        `cases=json.load(sys.stdin)
for sample in cases:
    direction=sample['direction']
    game=CenarioRegionalPygame(base64.b64decode(sample['png']))
    before=_pinta_pygame.FRect(2,99990 if direction>0 else -99996,4,6)
    desired=_pinta_pygame.FRect(2,99997 if direction>0 else -100003,4,6)
    landed=game.pouso(before,desired,direction)
    assert landed is not None, 'First landing failed'
    expected=100000.004-6 if direction>0 else -100000.004
    assert abs(landed.y-expected)<0.01
    for frame in range(20):
        previous=landed.copy()
        landed=game.pouso(previous,previous.move(0,direction*0.05),direction)
        assert landed is not None, 'Lost platform support after FRect rounding'
        assert abs(landed.y-expected)<0.01
    game.descartar()
print(json.dumps({'directions':2,'supportedFrames':40}))`,
        cases,
      ),
    ).toEqual({ directions: 2, supportedFrames: 40 })
  },
)

it.skipIf(!python)(
  'pygame-ce facade draws offsets and returns independent precise FRects without changing the bodies',
  async () => {
    const image = cover(),
      cells = new Int16Array(1024).fill(-1)
    cells[32] = 1
    cells[33] = 0
    const layers = encodePintaRegionLayers(
      [{ kind: 'regions', version: 1, side: 32, chunks: [{ col: 0, row: 0, cells }] }],
      { col: 0, row: 0, cols: 2, rows: 2 },
    )
    if (!layers) throw Error('Invalid test cells')
    const scene = {
      version: 4,
      id: 'test',
      name: 'Test',
      physics: 'precise',
      tileSize: 16,
      cols: 2,
      rows: 2,
      origin: { col: 0, row: 0 },
      tilesets: [
        {
          id: 'sheet',
          name: 'Sheet',
          image: url(image),
          columns: 2,
          count: 2,
          solid: [0],
          platform: [1],
        },
      ],
      layers: [
        {
          id: 'ground',
          kind: 'tiles',
          name: 'Ground',
          visible: true,
          tilesetId: 'sheet',
          cells: layers[0],
        },
      ],
    }
    const { png } = await embedPintaRegionImage(image, JSON.stringify(scene))
    expect(
      await run(
        `raw=base64.b64decode(json.load(sys.stdin))
calls=[]
def _imagem_em_memoria(png):
    calls.append(len(png))
    return _pinta_pygame.image.load(_pinta_io.BytesIO(png),'pinta.png')
game=CenarioRegionalPygame(raw)
assert len(calls)==1
before=_pinta_pygame.FRect(2,5,4,6)
after=_pinta_pygame.FRect(2,12,4,6)
landed=game.pouso(before,after)
assert isinstance(landed,_pinta_pygame.FRect) and tuple(landed)==(2,10,4,6)
assert tuple(before)==(2,5,4,6) and tuple(after)==(2,12,4,6)
assert not game.bloqueado(landed)
assert game.bloqueado(_pinta_pygame.FRect(18,17,2,2))
assert game.bloqueado(_pinta_pygame.FRect(-0.25,0,1,1))
assert game.pouso(after,before) is None
screen=_pinta_pygame.Surface((32,32),_pinta_pygame.SRCALPHA)
game.desenhar(screen,deslocamento=(0,-16),tempo=0)
assert tuple(screen.get_at((2,2)))==(0,255,0,255)
assert tuple(screen.get_at((18,2)))==(255,0,0,255)
assert screen.get_at((2,18)).a==0
game.descartar()
try:
    game.desenhar(screen)
    raise AssertionError('Closed game drew')
except RuntimeError:
    pass
print(json.dumps({'landed':list(landed),'capturedImages':len(calls)}))`,
        Buffer.from(png).toString('base64'),
      ),
    ).toEqual({ landed: [2, 10, 4, 6], capturedImages: 1 })
  },
)

it.skipIf(!python)(
  'pygame-ce keeps Vila/Cabana resources alive across doors and refuses replacement without losing the open map',
  async () => {
    const { map, cabana, assets } = regionVila(),
      find = (id: string) => assets.find((asset) => asset.id === id) ?? null
    const root = await exportPintaRegionScene(map, find, nativeImageOf),
      child = await exportPintaRegionScene(cabana, find, nativeImageOf)
    const childPng = (await embedPintaRegionImage(cover(), child.json)).png
    const bytes = (
      await embedPintaRegionImage(cover(), root.json, {
        world: {
          version: 1,
          rootId: map.id,
          maps: [{ id: cabana.id, name: cabana.name, png: url(childPng) }],
        },
      })
    ).png
    expect(
      await run(
        `data=json.load(sys.stdin)
raw=bytearray(base64.b64decode(data['png']))
game=CenarioRegionalPygame(raw)
raw[:]=bytes(len(raw))
door=next(obj for obj in game.objetos() if game.propriedade(obj,'destino') or game.propriedade(obj,'destination'))
child=game.abrir_destino(door)
assert child.cena.mapa_id==data['child'] and game.cena.mapa_id==data['root']
assert child._renderizador is game._renderizador
screen=_pinta_pygame.Surface((512,384),_pinta_pygame.SRCALPHA)
game.desenhar(screen,tempo=0)
before=hashlib.sha256(_pinta_pygame.image.tobytes(screen,'RGBA')).hexdigest()
broken=bytearray(base64.b64decode(data['png']))
broken[-5]^=1
try:
    game.substituir(broken)
    raise AssertionError('Corrupted replacement admitted')
except ValueError:
    pass
screen.fill((0,0,0,0))
game.desenhar(screen,tempo=0)
assert hashlib.sha256(_pinta_pygame.image.tobytes(screen,'RGBA')).hexdigest()==before
renderer=child._renderizador
game.descartar()
assert not renderer.fechado
screen.fill((0,0,0,0))
child.desenhar(screen,tempo=0)
assert any(_pinta_pygame.image.tobytes(screen,'RGBA'))
child.descartar()
assert renderer.fechado
print(json.dumps({'root':data['root'],'child':data['child'],'replacementPreserved':True,'sharedResourcesClosed':True}))`,
        { png: Buffer.from(bytes).toString('base64'), root: map.id, child: cabana.id },
      ),
    ).toEqual({
      root: map.id,
      child: cabana.id,
      replacementPreserved: true,
      sharedResourcesClosed: true,
    })
  },
)
