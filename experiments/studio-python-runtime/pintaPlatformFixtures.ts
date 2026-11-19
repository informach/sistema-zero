import { nativeImageRaster } from '../../packages/pinta/scripts/homologacao/generate'
import { platformPhysicsScenario } from '../../packages/pinta/scripts/homologacao/platforms'
import { deriveLoadedPintaImage } from '../../packages/pinta/src/export/portableImage'
import { collectMapTilesetsFrom } from '../../packages/pinta/src/tiles/mapTilesets'
import { pintaPythonProbeProject } from './pintaPhysicsFixtures'

export function isPintaPlatformFixture(name: string) {
  return /^pinta-platforms-[12]x$/.test(name)
}
export async function pintaPlatformProject(name: string) {
  if (!isPintaPlatformFixture(name)) throw Error('Unknown Pinta platform fixture')
  const scale = name.endsWith('2x') ? 2 : 1,
    { map, assets } = platformPhysicsScenario()
  const image = await deriveLoadedPintaImage(
    map,
    {
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: map.id,
      selection: { kind: 'map' },
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
      assets: assets.filter((a) => a.id !== map.id),
      tilesets: collectMapTilesetsFrom(map, assets),
      raster: nativeImageRaster(),
    },
  )
  return pintaPythonProbeProject(
    name,
    map.id,
    image,
    'Plataformas precisas',
    `import sys, json, pygame, pinta
assert sys.platform == 'emscripten'
pygame.init()
tela = pygame.display.set_mode((640,480))
scale = ${scale}
mapa = pinta.carregar_mapa('physics')
assert mapa.versao == 4 and mapa.cena['version'] == 3
def body(x,y,w=4,h=4): return pygame.FRect(x*scale,y*scale,w*scale,h*scale)
before, after = body(40,10), body(40,100)
support = mapa.pouso(before,after)
assert support is not None and abs(support.y/scale-36.25) < 0.0001
assert before == body(40,10) and after == body(40,100)
assert mapa.pouso(support,support) == support
assert mapa.pouso(body(40,100),body(40,10)) is None
assert mapa.pouso(body(40,40),body(40,100)) is None
assert mapa.pouso(before,after,0) is None
inverted = mapa.pouso(body(40,100),body(40,10),-1)
assert inverted is not None and abs(inverted.y/scale-42.25) < 0.0001
assert mapa.pouso(body(36,10),body(36,100)) is None
assert mapa.pouso(body(44,10),body(44,100)) is None
assert mapa.pouso(before,after,float('nan')) is None
corpo, vy = body(40,10,12,12), 0
for frame in range(120):
    antes = corpo.copy()
    vy += 300 * scale / 60
    corpo.y += vy / 60
    support = mapa.pouso(antes,corpo)
    if support is not None: corpo, vy = support, 0
assert abs(corpo.bottom/scale-40.25) < 0.0001 and vy == 0
print('platform-proof',json.dumps({'python':sys.version,'pygame':pygame.version.ver,'platform':sys.platform,'scale':scale,'queries':9,'frames':120,'feet':corpo.bottom/scale,'upside':inverted.y/scale}),flush=True)
print('platform-ready',scale,flush=True)
clock=pygame.time.Clock()
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT: raise SystemExit
    tela.fill('#152238')
    mapa.desenhar(tela)
    pygame.draw.rect(tela,'#4ade80',corpo)
    mapa.desenhar(tela,frente=True)
    pygame.display.flip()
    clock.tick(30)
`,
  )
}
