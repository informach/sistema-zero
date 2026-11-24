import { createCanvas } from '@napi-rs/canvas'
import { nativeImageOf } from '../../packages/pinta/scripts/homologacao/generate'
import { pngChunk } from '../../packages/pinta/src/export/pngText'
import { embedPintaRegionImage } from '../../packages/pinta/src/export/regionImage'
import { exportPintaRegionScene } from '../../packages/pinta/src/export/regionScene'
import { regionVila } from '../../packages/pinta/src/testing/regionVila'
import { regionVilaPlatform } from '../../packages/pinta/src/testing/regionVilaPlatform'
import { pgzeroMediaPath } from '../../packages/studio/src/core/pgzeroMediaPaths'
import { raylibMediaPath } from '../../packages/studio/src/core/raylibMediaPaths'
import { PGZERO_EXTENSION } from '../../packages/studio/src/runtime/python/pgzero/contract'
import {
  pythonPintaPgzeroBrowser,
  pythonPintaRaylib2dBrowser,
} from '../../packages/studio/src/runtime/python/pintaBrowserSceneSource'
import {
  RAYLIB_2D_EXTENSION,
  RAYLIB_EXTENSION_IDS,
} from '../../packages/studio/src/runtime/python/raylib/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../packages/studio/src/state/pythonProjectValidation'

export function isPintaBrowser2dFixture(name: string) {
  return /^pinta-regional-(?:pgzero|raylib2d)(?:-fornecido)?$/.test(name)
}

/**
 * Where the Studio panel puts a PNG brought from the Pinta (projectStore addAsset): Pygame Zero
 * and Raylib keep images in `images/`, Pygame-ce and Turtle in `assets/`. The proof uses the same
 * rules, so a scenario module that looks in the wrong folder cannot pass by accident.
 */
export function pintaSceneAssetPath(extensionId: string, name: string, entrypoint = 'main.py') {
  const input = {
    entrypoint,
    name,
    kind: 'image' as const,
    extension: 'png',
    occupied: { files: [], directories: [] },
  }
  const placed =
    extensionId === PGZERO_EXTENSION.id
      ? pgzeroMediaPath(input)
      : (RAYLIB_EXTENSION_IDS as readonly string[]).includes(extensionId)
        ? raylibMediaPath(input)
        : { path: `assets/${name}.png` }
  if ('error' in placed) throw Error(placed.error)
  return placed.path
}

function pngUrl(bytes: Uint8Array) {
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
}

function corruptIdat(url: string) {
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

async function worlds() {
  const { map, cabana, assets } = regionVila()
  const find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const root = await exportPintaRegionScene(map, find, nativeImageOf)
  const child = await exportPintaRegionScene(cabana, find, nativeImageOf)
  const childSheet = child.scene.tilesets[0]
  if (!childSheet) throw Error('Cabana sem peças')
  const broken = JSON.stringify({
    ...JSON.parse(child.json),
    tilesets: [
      { ...childSheet, image: corruptIdat(childSheet.image) },
      ...child.scene.tilesets.slice(1),
    ],
  })
  const cover = new Uint8Array(createCanvas(32, 32).toBuffer('image/png'))
  async function world(json: string) {
    const inside = await embedPintaRegionImage(cover, json)
    return embedPintaRegionImage(cover, root.json, {
      world: {
        version: 1,
        rootId: map.id,
        maps: [{ id: cabana.id, name: cabana.name, png: pngUrl(inside.png) }],
      },
    })
  }
  // Física antiga com peças de plataforma (decisão de 23/11): seguram por cima, como no JS.
  const platform = regionVilaPlatform()
  const legacy = await exportPintaRegionScene(
    { ...platform.map, physics: undefined },
    (id) => platform.assets.find((asset) => asset.id === id) ?? null,
    nativeImageOf,
  )
  if (legacy.scene.physics !== 'legacy')
    throw Error('A Vila com plataforma devia sair na física antiga')
  return Promise.all([world(child.json), world(broken), embedPintaRegionImage(cover, legacy.json)])
}
const ASSET_IDS = ['mundo', 'recusa', 'plataforma'] as const

const setup = (supplied: boolean, folder: string) => `import json,sys,struct,zlib
from pathlib import Path
assert sys.platform == 'emscripten'
initial=bytearray(Path('${folder}/mundo.png').read_bytes())
root=${supplied ? "pinta.carregar_cenario('mundo')" : 'Backend(initial)'}
initial[:]=bytes(len(initial))
owner=root._renderizador._owner
assert owner > 0 and root.limites[2:]==(160000,160000)
bad=Path('${folder}/recusa.png').read_bytes()
bad_registry=${supplied ? 'pinta.ler_mundo_png' : 'ler_mundo_png'}(bad)
assert len(bad_registry['maps'])==2
try:
    root.substituir(${supplied ? "'recusa'" : 'bad'})
except ValueError as error:
    assert 'imagem do cenário' in str(error), str(error)
else:
    raise AssertionError('IDAT estragado admitido pelo motor')
assert root._renderizador._owner==owner

def tile_png():
    def chunk(kind,payload):
        return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload))
    # Blue and white are outside the crop. Yellow has half alpha before the draw's opacity.
    pixels=bytes((0,0,255,255, 255,0,0,255, 0,255,0,255, 255,255,255,255))
    pixels+=b'\\0'+bytes((0,0,255,255, 255,255,0,128, 255,0,255,255, 255,255,255,255))
    return (b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>2I5B',4,2,8,6,0,0,0))
            +chunk(b'IDAT',zlib.compress(b'\\0'+pixels))+chunk(b'IEND',b''))

overlay=${supplied ? 'pinta._PintaBrowserAffine' : '_PintaBrowserAffine'}({'atlas':{'png':tile_png(),'width':4,'height':2}},transport)
assert overlay._owner==owner+1
current=root
retire_overlay=False
door=root.objeto_por_id('door')
with root.abrir_destino(door) as cabana:
    assert cabana._renderizador is root._renderizador
    assert cabana.cena.mapa_id=='cabana'
    with cabana.abrir_destino(cabana.objeto_por_id('cabana-saida')) as volta:
        assert volta.cena.mapa_id==root.cena.mapa_id

def place():
    global current
    next_place=current.abrir_destino(next(o for o in current.objetos() if o.get('role')=='door'))
    if current is not root: current.descartar()
    current=next_place
    print('Pinta lugar',current.cena.mapa_id,flush=True)

def reload_world():
    global current
    if current is not root: current.descartar()
    current=root
    previous=root._renderizador
    root.substituir(${supplied ? "'mundo'" : `Path('${folder}/mundo.png').read_bytes()`})
    assert previous._owner is None and root._renderizador._owner > owner+1
    print('Pinta substituição concluída',flush=True)

def accent():
    if overlay._owner is not None:
        overlay.desenhar('atlas',(1,0,2,2),(-4,1,2,4,14.25,4.25),0.5)
        if retire_overlay:
            overlay.descartar()
            print('Pinta recorte descartado',flush=True)

# Física antiga: a peça de plataforma (linha -4, topo y = -64) segura por cima e deixa passar por
# baixo; o chão sólido continua parede. A Vila, sem peça de plataforma, não segura nada.
platform=${supplied ? "pinta.carregar_cenario('plataforma')" : `Backend(Path('${folder}/plataforma.png').read_bytes())`}
assert platform.cena.fisica=='legacy', platform.cena.fisica
assert tuple(platform.pouso((8,-80,12,12),(8,-60,12,12)))==(8,-76,12,12)
assert platform.pouso((8,-50,12,12),(8,-70,12,12)) is None
assert platform.pouso((8,-80,12,12),(8,-60,12,12),0) is None
assert not platform.bloqueado((8,-60,12,12)) and platform.bloqueado((8,-30,12,12))
assert root.pouso((8,-80,12,12),(8,-60,12,12)) is None
platform.descartar()
print('Pinta plataforma de mão única',flush=True)

print('Pinta pronta',json.dumps({'platform':sys.platform,'world':root.cena.mapa_id,
      'width':root.limites[2],'rollback':True,'owner':owner}),flush=True)
`

function moduleImport(extension: 'python-pgzero' | 'python-raylib') {
  return `import pinta
assert pinta.__file__.startswith('/studio/extensions/${extension}-'), pinta.__file__
print('Pinta fornecido',pinta.__file__,flush=True)
`
}

const pgzero = (supplied: boolean, folder: string) => `
from pgzero import _sz as transport
${supplied ? moduleImport('python-pgzero') : 'Backend=CenarioRegionalPygameZero'}
WIDTH,HEIGHT=320,240
${setup(supplied, folder)}

def draw():
    screen.fill((0,0,0))
    current.desenhar(screen,tempo=135)
    current.desenhar(screen,frente=True,tempo=135)
    screen.draw.filled_rect(Rect(0,0,21,20),(0,0,0))
    accent()
    screen.draw.filled_rect(Rect(21,0,2,2),(0,0,255))

def on_key_down(key):
    global retire_overlay
    if key==keys.RETURN: place()
    if key==keys.D: retire_overlay=True
    if key==keys.R: reload_world()
`

const raylib = (supplied: boolean, folder: string) => `
import pyray as ray
from _szraylib import _rt as transport
${supplied ? moduleImport('python-raylib') : 'Backend=CenarioRegionalRaylib2D'}
ray.init_window(320,240,'Cenário do Pinta')
ray.set_target_fps(30)
${setup(supplied, folder)}

while not ray.window_should_close():
    if ray.is_key_pressed(ray.KEY_ENTER): place()
    if ray.is_key_pressed(ray.KEY_D): retire_overlay=True
    if ray.is_key_pressed(ray.KEY_R): reload_world()
    ray.begin_drawing()
    ray.clear_background(ray.BLACK)
    current.desenhar(tempo=135)
    current.desenhar(frente=True,tempo=135)
    ray.draw_rectangle(0,0,21,20,ray.BLACK)
    accent()
    ray.draw_rectangle(21,0,2,2,ray.BLUE)
    ray.end_drawing()
if current is not root: current.descartar()
root.descartar()
overlay.descartar()
ray.close_window()
`

let captured: ReturnType<typeof worlds> | undefined
export async function pintaBrowser2dProject(name: string) {
  if (!isPintaBrowser2dFixture(name)) throw Error('Fixture regional desconhecida')
  const isPgzero = name.startsWith('pinta-regional-pgzero')
  const supplied = name.endsWith('-fornecido')
  const extension = isPgzero ? PGZERO_EXTENSION : RAYLIB_2D_EXTENSION
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw Error('fixture')
  captured ??= worlds()
  const pngs = await captured
  project.id = name
  project.name = 'A Vila e a Floresta — navegador'
  project.installedExtensions = [{ ...extension, installedAt: project.createdAt }]
  project.python.entrypoint = 'main.py'
  project.assets = pngs.map(({ png, width, height }, index) => {
    const id = ASSET_IDS[index]!
    return {
      id,
      name: id,
      kind: 'image',
      source: 'library',
      libOrigin: 'pinta',
      libId: `personal:${id}`,
      libRevision: 1,
      proPath: pintaSceneAssetPath(extension.id, id),
      dataUrl: pngUrl(png),
      width,
      height,
    }
  })
  const folder = pintaSceneAssetPath(extension.id, 'mundo').slice(0, -'/mundo.png'.length)
  const source = isPgzero ? pgzero(supplied, folder) : raylib(supplied, folder)
  const composed = isPgzero ? pythonPintaPgzeroBrowser : pythonPintaRaylib2dBrowser
  project.tree = pythonFilesToTree({ 'main.py': supplied ? source : `${composed}\n${source}` })
  return project
}
