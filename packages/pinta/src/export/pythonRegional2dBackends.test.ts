import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { regionVila } from '../testing/regionVila'
import { pngChunk } from './pngText'
import { pythonPgzeroRegional } from './pythonPgzeroRegional'
import { pythonPygameAffine } from './pythonPygameAffine'
import { pythonRaylib2dRegional } from './pythonRaylib2dRegional'
import { pythonRegionWorld } from './pythonRegionWorld'
import { pythonSceneBackend } from './pythonSceneBackend'
import { pythonSceneRuntime } from './pythonSceneRuntime'
import { embedPintaRegionImage } from './regionImage'
import { exportPintaRegionScene } from './regionScene'

const environment = {
  ...process.env,
  PYGAME_HIDE_SUPPORT_PROMPT: '1',
  SDL_VIDEODRIVER: 'dummy',
  SDL_AUDIODRIVER: 'dummy',
}

function compatiblePython(probe: string) {
  return [process.env.PYTHON, 'python3', 'python'].find(
    (name) =>
      name &&
      spawnSync(name, ['-I', '-c', probe], { env: environment, timeout: 5000 }).status === 0,
  )
}

const pgzero = compatiblePython('import pygame, pgzero.screen')
// The real Raylib binding requires a desktop/OpenGL context, even with a hidden window.
const raylib = process.env.PINTA_RAYLIB_PYTHON

function runNative(python: string, source: string, input: unknown = null) {
  const file = join(tmpdir(), `pinta-native-${randomUUID()}.py`)
  writeFileSync(file, source, { flag: 'wx' })
  try {
    const result = spawnSync(python, ['-I', file], {
      env: environment,
      input: JSON.stringify(input),
      encoding: 'utf8',
      timeout: 30_000,
    })
    expect(result.status, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`).toBe(0)
  } finally {
    unlinkSync(file)
  }
}

const atlas = `import struct,zlib

def chunk(kind, payload):
    return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload))

def png(width,height,pixels):
    raw=b''.join(b'\\0'+bytes(pixels[i:i+width*4]) for i in range(0,len(pixels),width*4))
    return (b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>2I5B',width,height,8,6,0,0,0))
            +chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))

atlas=png(4,2,[0,0,255,255, 255,0,0,255, 0,255,0,255, 255,255,255,255,
               0,0,255,255, 255,255,0,128, 255,0,255,255, 255,255,255,255])
indexed=(atlas[:8]+chunk(b'IHDR',struct.pack('>2I5B',2,1,8,3,0,0,0))
        +chunk(b'PLTE',bytes((0,0,255, 255,0,0)))+chunk(b'tRNS',bytes((0,128)))
        +chunk(b'IDAT',zlib.compress(bytes((0,0,1))))+chunk(b'IEND',b''))
images={'atlas':dict(png=atlas,width=4,height=2),'indexed':dict(png=indexed,width=2,height=1)}
crop=(1,0,2,2)
matrix=(-4,1,2,4,14.25,4.25)
`

const worldSource = `${pythonRegionWorld}\n${pythonSceneRuntime}\n${pythonSceneBackend}`

test.skipIf(!pgzero)(
  'pygame-ce rasterizes cropped affine art and preserves alpha on a real Pygame Zero screen',
  () => {
    runNative(
      pgzero!,
      `${atlas}
${pythonPygameAffine}
from pgzero.screen import Screen
pg=_pinta_pygame
renderer=_PintaPygameAffine(images)
tela=pg.Surface((32,24),pg.SRCALPHA)
screen=Screen(tela)
assert screen.surface is tela
tela.fill((5,6,7,255),(22,20,1,1))
draw=renderer.desenhar(screen.surface)
draw('atlas',crop,matrix,0.5)
draw('indexed',(0,0,2,1),(1,0,0,1,22,20),1)
for point, expected in {
    (13,6):(255,0,0,128), (9,7):(0,255,0,128),
    (15,10):(255,255,0,64), (11,11):(255,0,255,128),
    (6,4):(0,0,0,0), (22,20):(5,6,7,255), (23,20):(255,0,0,128),
}.items():
    assert tuple(tela.get_at(point)) == expected, (point,tela.get_at(point))
assert renderer._cache_bytes <= renderer._LIMITE_CACHE
entry=next(iter(renderer._cache.values()))
draw('atlas',crop,(*matrix[:4],matrix[4]+3,matrix[5]+2),1)
assert next(iter(renderer._cache.values())) is entry
assert tela.get_at((16,8)).a == 255

# A caller requesting a resource can edit its copy without changing the renderer.
copia=renderer.imagem('atlas')
copia.fill('black')
assert renderer.imagem('unknown') is None
tela.set_clip((3,4,2,2))
renderer.desenhar(tela)('atlas',crop,(1,0,0,1,3.25,4.25),1)
assert tuple(tela.get_at((3,4))) == (255,0,0,255)
assert tuple(tela.get_at((4,5))) == (255,0,255,255)
assert tela.get_at((2,4)).a == 0

# A huge transformed asset only allocates the clipped destination fragment.
renderer._LIMITE_CACHE=16
renderer.desenhar(tela)('atlas',crop,(10**7,0,0,10**7,-42,-42),1)
assert renderer._cache_bytes == 16 and len(renderer._cache) == 1
assert next(iter(renderer._cache.values())).get_size() == (2,2)
assert tuple(tela.get_at((3,4))) == (255,0,0,255)
renderer.descartar()
renderer.descartar()
assert renderer.fechado and not renderer._cache and renderer._cache_bytes == 0
`,
    )
  },
)

test.skipIf(!raylib)(
  'native Raylib 2D paints the same affine crop into its framebuffer and flushes before release',
  () => {
    runNative(
      raylib!,
      `${atlas}
${pythonSceneBackend}
${pythonRaylib2dRegional}
from concurrent.futures import ThreadPoolExecutor
ray=_pinta_raylib
ray.set_trace_log_level(ray.LOG_ERROR)
ray.set_config_flags(ray.FLAG_WINDOW_HIDDEN)
ray.init_window(32,24,'Pinta')
assert ray.is_window_ready()
target=ray.load_render_texture(32,24)
try:
    renderer=_PintaRaylibAffine(images)
    with ThreadPoolExecutor() as executor:
        error=executor.submit(renderer.descartar).exception()
        assert isinstance(error, RuntimeError) and 'thread' in str(error)
    assert len(renderer._texturas)==len(images)
    ray.begin_texture_mode(target)
    ray.clear_background(ray.BLACK)
    renderer.desenhar('atlas',crop,matrix,0.5)
    renderer.desenhar('indexed',(0,0,2,1),(1,0,0,1,22,20),1)
    renderer.descartar()  # The caller may retire a world during this draw pass.
    renderer.descartar()
    ray.draw_pixel(31,23,ray.WHITE)
    ray.end_texture_mode()
    image=ray.load_image_from_texture(target.texture)
    try:
        for point, expected in {
            (13,6):(128,0,0), (9,7):(0,128,0), (15,10):(64,64,0),
            (11,11):(128,0,128), (6,4):(0,0,0), (31,23):(255,255,255),
            (22,20):(0,0,0), (23,20):(128,0,0),
        }.items():
            x,y=point
            color=ray.get_image_color(image,x,23-y)
            actual=color.r,color.g,color.b
            assert all(abs(a-b)<=1 for a,b in zip(actual,expected)), (point, actual, expected)
    finally:
        ray.unload_image(image)
finally:
    ray.unload_render_texture(target)
    ray.close_window()
`,
    )
  },
)

function pngUrl(bytes: Uint8Array) {
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
}

function corruptPixels(url: string) {
  const png = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
  const parts: Uint8Array[] = [png.subarray(0, 8)]
  let idat = false
  for (let at = 8; at < png.length; ) {
    const end = at + 12 + png.readUInt32BE(at)
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') {
      if (!idat) parts.push(pngChunk('IDAT', new Uint8Array(16)))
      idat = true
    } else {
      parts.push(png.subarray(at, end))
    }
    at = end
  }
  if (!idat) throw Error('Fixture PNG sem pixels')
  return pngUrl(Buffer.concat(parts))
}

async function vilaWorld() {
  const { map, cabana, assets } = regionVila()
  const find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const [root, child] = await Promise.all(
    [map, cabana].map((model) => exportPintaRegionScene(model, find, nativeImageOf)),
  )
  if (!root || !child) throw Error('Fixture Vila/Cabana inválida')
  const rootJson = root.json
  const cover = createCanvas(32, 32).toBuffer('image/png')
  async function wrap(childJson: string) {
    const inside = await embedPintaRegionImage(cover, childJson)
    const world = await embedPintaRegionImage(cover, rootJson, {
      world: {
        version: 1,
        rootId: map.id,
        maps: [{ id: cabana.id, name: cabana.name, png: pngUrl(inside.png) }],
      },
    })
    return Buffer.from(world.png).toString('base64')
  }
  const changedSheet = child.scene.tilesets[0]
  if (!changedSheet) throw Error('Peças da Cabana ausentes')
  const badChild = JSON.stringify({
    ...JSON.parse(child.json),
    tilesets: [
      { ...changedSheet, image: corruptPixels(changedSheet.image) },
      ...child.scene.tilesets.slice(1),
    ],
  })
  const [good, bad] = await Promise.all([wrap(child.json), wrap(badChild)])
  return { good, bad, rootId: map.id, childId: cabana.id }
}

const playWorld = `import json,sys
def pixel(pixels,x,y):
    i=(y*160+x)*4
    return tuple(pixels[i:i+3])

data=json.load(sys.stdin)
source=bytearray(base64.b64decode(data['good']))
game=Backend(source)
try:
    source[:]=b'\\x00'*len(source)
    assert game.cena.mapa_id == data['rootId']
    assert game.limites[2:] == (160000,160000)
    assert game.objetos() and game.tempo_decorrido >= 0
    before=frame(game)
    assert len(set(zip(*[iter(before)]*4))) > 8
    saved_scene=game.cena
    saved_renderer=game._renderizador
    try:
        game.carregar('sem mapa')
    except KeyError:
        pass
    else:
        raise AssertionError('a troca exigia o ID do lugar')
    assert game.cena is saved_scene

    # The admission layer accepts this PNG's header/CRC; the graphics decoder
    # must still refuse its child tileset pixels without changing the live scene.
    broken=base64.b64decode(data['bad'])
    captured=ler_mundo_png(broken)
    assert list(captured['maps']) == [data['rootId'],data['childId']]
    try:
        game.substituir(broken)
    except ValueError as error:
        assert 'imagem do cenário' in str(error), error
    else:
        raise AssertionError('um recurso com IDAT defeituoso substituiu a cena')
    assert game.cena is saved_scene and game._renderizador is saved_renderer
    assert frame(game) == before

    door=game.objeto_por_id('door')
    assert game.propriedade(door,'destino') == data['childId']
    porta=dict(door,properties=dict(door['properties'],destino={'type':'asset','value':data['childId']}))
    with game.abrir_destino(porta) as child:
        assert child.cena.mapa_id == data['childId']
        assert game.cena is saved_scene and child._renderizador is saved_renderer
        assert child._owner.inicio == game._owner.inicio
        after=frame(child)
        assert after != before
        assert pixel(after,48,32)==(105,76,56),pixel(after,48,32)
        assert pixel(after,49,33)==(161,135,82),pixel(after,49,33)
        with game.abrir_destino(door) as match:
            assert frame(match) == after
        with child.abrir_destino(child.objeto_por_id('cabana-saida')) as return_to_vila:
            assert frame(return_to_vila) == before
        game.carregar(data['childId'])
        assert frame(game) == after
        game.substituir(base64.b64decode(data['good']))
        assert game._renderizador is not saved_renderer and frame(game) == before
        assert frame(child) == after
    assert released(saved_renderer)
finally:
    game.descartar()

with Backend(base64.b64decode(data['good'])).abrir_lugar(data['childId']) as standalone:
    renderer=standalone._renderizador
    assert frame(standalone) == after
assert released(renderer)
`

test.skipIf(!pgzero)(
  'native Pygame Zero draws Vila and Cabana PNGs and keeps the loaded world if a child PNG fails',
  async () => {
    runNative(
      pgzero!,
      `${worldSource}\n${pythonPygameAffine}\n${pythonPgzeroRegional}
from pgzero.screen import Screen
Backend=CenarioRegionalPygameZero
pg=_pinta_pygame
screen=Screen(pg.Surface((160,128),pg.SRCALPHA))
def frame(game):
    screen.surface.fill((0,0,0,255))
    x,y=game.ponto_inicial()
    for frente in (False,True):
        game.desenhar(screen,(x-80,y-64),frente,135)
    return pg.image.tobytes(screen.surface,'RGBA')

def released(renderer):
    return renderer.fechado

${playWorld}`,
      await vilaWorld(),
    )
  },
)

test.skipIf(!raylib)(
  'native Raylib 2D draws Vila and Cabana PNGs and keeps the loaded world if a child PNG fails',
  async () => {
    runNative(
      raylib!,
      `${worldSource}\n${pythonRaylib2dRegional}
Backend=CenarioRegionalRaylib2D
ray=_pinta_raylib
ray.set_trace_log_level(ray.LOG_ERROR)
ray.set_config_flags(ray.FLAG_WINDOW_HIDDEN)
ray.init_window(160,128,'Pinta')
assert ray.is_window_ready()
target=ray.load_render_texture(160,128)

def frame(game):
    x,y=game.ponto_inicial()
    ray.begin_texture_mode(target)
    try:
        ray.clear_background(ray.BLACK)
        for frente in (False,True):
            game.desenhar((x-80,y-64),frente,135)
    finally:
        ray.end_texture_mode()
    image=ray.load_image_from_texture(target.texture)
    try:
        ray.image_flip_vertical(ray.ffi.addressof(image))
        pixels=ray.load_image_colors(image)
        try:
            return bytes(ray.ffi.buffer(pixels,160*128*4))
        finally:
            ray.unload_image_colors(pixels)
    finally:
        ray.unload_image(image)

def released(renderer):
    return not renderer._texturas

try:
    exec(${JSON.stringify(playWorld)})
finally:
    ray.unload_render_texture(target)
    ray.close_window()
`,
      await vilaWorld(),
    )
  },
)
