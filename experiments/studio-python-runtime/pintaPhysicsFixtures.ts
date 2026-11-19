import { nativeImageRaster } from '../../packages/pinta/scripts/homologacao/generate'
import { objectPhysicsWorldScenario } from '../../packages/pinta/scripts/homologacao/physics'
import { deriveLoadedPintaImage } from '../../packages/pinta/src/export/portableImage'
import { collectMapTilesetsFrom } from '../../packages/pinta/src/tiles/mapTilesets'
import { PYGAME_EXTENSION } from '../../packages/studio/src/runtime/python/pygame/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../packages/studio/src/state/pythonProjectValidation'

export function isPintaPhysicsFixture(name: string) {
  return /^pinta-physics-[12]x$/.test(name)
}

export async function pintaPhysicsProject(name: string) {
  if (!isPintaPhysicsFixture(name)) throw new Error('Unknown Pinta physics fixture')
  const scale = name.endsWith('2x') ? 2 : 1
  const { map, assets, probes } = objectPhysicsWorldScenario()
  const dependencies = assets.filter((a) => a.id !== map.id)
  const image = await deriveLoadedPintaImage(
    map,
    {
      version: 2,
      algorithm: 'pinta-image-1',
      drawingId: map.id,
      selection: { kind: 'map-world' },
      scale,
    },
    {
      dimension: 4096,
      imagePixels: 4194304,
      totalImagePixels: 16777216,
      imageBytes: 16777216,
      dataUrlChars: 800000,
    },
    {
      assets: dependencies,
      tilesets: collectMapTilesetsFrom(map, assets),
      raster: nativeImageRaster(),
    },
  )
  return pintaPythonProbeProject(
    name,
    map.id,
    image,
    'Contornos do cenário',
    `import sys, json, pygame, pinta
assert sys.platform == 'emscripten'
pygame.init()
tela = pygame.display.set_mode((640, 480))
scale = ${scale}
root = pinta.carregar_mapa('physics')
assert root.versao == 4 and root.cena['version'] == 1
mapa = root.abrir_destino(root.objeto_por_id('to-physics'))
assert mapa.versao == 4 and mapa.cena['version'] == 3
back = mapa.abrir_destino(mapa.objeto_por_id('back'))
assert back.nome == root.nome and back.cena['version'] == 1
assert mapa.objeto_por_id('ellipse').colisao
reference = mapa.objeto_por_id('affine/reference').propriedades['alvo']
assert reference == 'affine/inner-ellipse' and mapa.objeto_por_id(reference).colisao
probes = json.loads(${JSON.stringify(JSON.stringify(probes))})
for probe in probes:
    box = probe['box']
    rect = pygame.FRect(*(box[key] * scale for key in ('x','y','width','height')))
    assert mapa.bloqueado(rect) is probe['blocked'], probe['name']
mapa._cena.jogador = pygame.FRect(10 * scale, 28 * scale, 10 * scale, 10 * scale)
mapa._cena.mover(100 * scale, 0)
assert abs(mapa._cena.jogador.x - 30 * scale) < 0.00001
print('physics-proof', json.dumps({'python':sys.version,'pygame':pygame.version.ver,'platform':sys.platform,'scale':scale,'probes':len(probes),'movement':True,'worldRootScene':1,'returnDoor':True}), flush=True)
print('physics-ready', scale, flush=True)
clock = pygame.time.Clock()
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT: raise SystemExit
    tela.fill('#152238')
    mapa.desenhar(tela)
    pygame.draw.rect(tela,'#4ade80',(30 * scale,28 * scale,10 * scale,10 * scale))
    mapa.desenhar(tela,frente=True)
    pygame.display.flip()
    clock.tick(30)
`,
  )
}

/** Same real image binding for independent authoring fixtures; no synthetic runtime data. */
export function pintaPythonProbeProject(
  name: string,
  drawingId: string,
  image: Awaited<ReturnType<typeof deriveLoadedPintaImage>>,
  title: string,
  source: string,
) {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.id = name
  project.name = title
  project.installedExtensions = [{ ...PYGAME_EXTENSION, installedAt: project.createdAt }]
  project.python.entrypoint = 'main.py'
  project.assets = [
    {
      id: 'physics',
      name: 'physics',
      kind: 'image',
      source: 'library',
      libOrigin: 'pinta',
      libId: `personal:${drawingId}`,
      libRevision: 1,
      proPath: 'assets/physics.png',
      dataUrl: image.dataUrl,
      width: image.derivation.output.width,
      height: image.derivation.output.height,
      pintaImage: image.derivation,
    },
  ]
  project.tree = pythonFilesToTree({ 'main.py': source })
  return project
}
