import type { PintaImageRecipe } from '../../packages/core/src/studio/pinta-image'
import { vilaEFloresta } from '../../packages/pinta/scripts/homologacao/fixture'
import { nativeImageRaster } from '../../packages/pinta/scripts/homologacao/generate'
import { deriveLoadedPintaImage } from '../../packages/pinta/src/export/portableImage'
import { collectMapTilesetsFrom } from '../../packages/pinta/src/tiles/mapTilesets'
import { PYGAME_EXTENSION } from '../../packages/studio/src/runtime/python/pygame/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../packages/studio/src/state/pythonProjectValidation'

// The production producer and the acceptance scene supply the real PNG, not a fake runtime.
// Kept in the local qualification server; none of this fixture enters a runtime artifact.
const captures = new Map<number, ReturnType<typeof capture>>()
async function capture(scale: number) {
  const { map, assets } = vilaEFloresta()
  const recipe: PintaImageRecipe = {
    version: 2,
    algorithm: 'pinta-image-1',
    drawingId: map.id,
    selection: { kind: 'map-world' },
    scale,
  }
  return deriveLoadedPintaImage(
    map,
    recipe,
    {
      dimension: 4096,
      imagePixels: 4_194_304,
      totalImagePixels: 16_777_216,
      imageBytes: 16_777_216,
      dataUrlChars: 800_000,
    },
    {
      assets: assets.filter((asset) => asset.id !== map.id),
      tilesets: collectMapTilesetsFrom(map, assets),
      raster: nativeImageRaster(),
    },
  )
}

export function isPintaWorldFixture(name: string) {
  return name === 'pinta-world-1x' || name === 'pinta-world-2x'
}

export async function pintaWorldProject(name: string) {
  if (!isPintaWorldFixture(name)) throw new Error('Unknown Pinta world fixture')
  const scale = name === 'pinta-world-1x' ? 1 : 2
  let pending = captures.get(scale)
  if (!pending) {
    pending = capture(scale)
    captures.set(scale, pending)
  }
  const image = await pending
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.id = name
  project.name = 'A Vila e a Floresta'
  project.installedExtensions = [{ ...PYGAME_EXTENSION, installedAt: project.createdAt }]
  project.python.entrypoint = 'main.py'
  project.assets = [
    {
      id: 'vila',
      name: 'vila',
      kind: 'image',
      source: 'library',
      libOrigin: 'pinta',
      libId: 'personal:vila-e-floresta',
      libRevision: 1,
      proPath: 'assets/vila.png',
      dataUrl: image.dataUrl,
      width: image.derivation.output.width,
      height: image.derivation.output.height,
      pintaImage: image.derivation,
    },
  ]
  project.tree = pythonFilesToTree({
    'main.py': `import sys, json, tempfile, pygame, pinta
from pathlib import Path
assert sys.platform == 'emscripten', sys.platform
pygame.init()
tela = pygame.display.set_mode((640, 480))
clock = pygame.time.Clock()
scale = ${scale}
root = pinta.carregar_mapa('vila')
assert not list(Path(tempfile.gettempdir()).glob('pinta-image-*')), 'Temporary decoding files leaked'
try: pinta._imagem_em_memoria(b'not a PNG')
except pygame.error: pass
else: raise AssertionError('A corrupt image must fail in the actual SDL decoder')
assert not list(Path(tempfile.gettempdir()).glob('pinta-image-*')), 'Failed decoding leaked files'
assert len(root.camadas) == 18
assert root.ponto_inicial() == (32 * scale, 32 * scale)
assert len(root.solidos()) == 57
assert root._cena.bloqueado(pygame.FRect(root.solidos()[0]))
door = next(obj for obj in root.objetos() if obj.id == 'door')
assert door.propriedades['chave'] == 1
assert root.objeto_por_id('morador-obj').propriedades['vida'] == 5
frames = []
original_clock = root._cena.inicio_animacao
for elapsed in [0, 200]:
    root._cena.inicio_animacao = pygame.time.get_ticks() - elapsed
    surface = pygame.Surface((640, 480), pygame.SRCALPHA)
    root.desenhar(surface)
    frames.append(pygame.image.tobytes(surface, 'RGBA'))
root._cena.inicio_animacao = original_clock
assert frames[0] != frames[1], 'Water must animate in the actual Wasm compositor'
child = root.abrir_destino(door)
assert not list(Path(tempfile.gettempdir()).glob('pinta-image-*'))
assert child.nome == 'cabana' and len(child.camadas) == 2
assert child.ponto_inicial() == root.ponto_inicial()
back = child.abrir_destino(next(obj for obj in child.objetos() if obj.papel == 'door'))
assert back.nome == root.nome and len(back.camadas) == 18
door.propriedades['destino'] = '../outside.png'
try: root.abrir_destino(door)
except (KeyError, ValueError): pass
else: raise AssertionError('A door must not open an arbitrary path')
door.propriedades['destino'] = 'cabana'
print('world-runtime', json.dumps({'python': sys.version, 'pygame': pygame.version.ver,
      'platform': sys.platform, 'scale': scale, 'layers': len(root.camadas),
      'solids': len(root.solidos()), 'animation': True, 'returnDoor': True}), flush=True)
print('world-ready', scale, flush=True)
current = root
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT: raise SystemExit
        if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
            current = current.abrir_destino(next(obj for obj in current.objetos() if obj.papel == 'door'))
            print('world-place', current.nome, len(current.camadas), flush=True)
    tela.fill((19, 28, 46))
    current.desenhar(tela)
    x, y = current.ponto_inicial()
    pygame.draw.rect(tela, 'white', (x, y, 10 * scale, 10 * scale))
    current.desenhar(tela, frente=True)
    pygame.display.flip()
    clock.tick(30)
`,
  })
  return project
}
