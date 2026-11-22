import { createCanvas } from '@napi-rs/canvas'
import { nativeImageOf } from '../../packages/pinta/scripts/homologacao/generate'
import { pythonPygameAffine } from '../../packages/pinta/src/export/pythonPygameAffine'
import { pythonPygameRegional } from '../../packages/pinta/src/export/pythonPygameRegional'
import { pythonRegionWorld } from '../../packages/pinta/src/export/pythonRegionWorld'
import { pythonSceneBackend } from '../../packages/pinta/src/export/pythonSceneBackend'
import { pythonSceneRuntime } from '../../packages/pinta/src/export/pythonSceneRuntime'
import { embedPintaRegionImage } from '../../packages/pinta/src/export/regionImage'
import { exportPintaRegionScene } from '../../packages/pinta/src/export/regionScene'
import { regionPlatformPng } from '../../packages/pinta/src/testing/regionPlatformPng'
import { regionVila } from '../../packages/pinta/src/testing/regionVila'
import { PYGAME_EXTENSION } from '../../packages/studio/src/runtime/python/pygame/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../packages/studio/src/state/pythonProjectValidation'

// Qualification-only composition in the project's own source. This does not
// advertise a new provided module or activate a production runtime release.
const moduleSource = [
  pythonRegionWorld,
  pythonSceneRuntime,
  pythonSceneBackend,
  pythonPygameAffine,
  pythonPygameRegional,
].join('\n')
export function isPintaRegionalFixture(name: string) {
  return name === 'pinta-regional-pygame-1x' || name === 'pinta-regional-pygame-2x'
}
const captures = new Map<number, ReturnType<typeof capture>>()
async function capture(scale: number) {
  const { map, cabana, assets } = regionVila(),
    find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const root = await exportPintaRegionScene(map, find, nativeImageOf),
    child = await exportPintaRegionScene(cabana, find, nativeImageOf)
  const cover = new Uint8Array(createCanvas(32, 16).toBuffer('image/png'))
  const childImage = await embedPintaRegionImage(cover, child.json, { scale })
  return embedPintaRegionImage(cover, root.json, {
    scale,
    world: {
      version: 1,
      rootId: map.id,
      maps: [
        {
          id: cabana.id,
          name: cabana.name,
          png: `data:image/png;base64,${Buffer.from(childImage.png).toString('base64')}`,
        },
      ],
    },
  })
}
export async function pintaRegionalProject(name: string) {
  if (!isPintaRegionalFixture(name)) throw Error('Unknown regional Pinta fixture')
  const scale = name.endsWith('-2x') ? 2 : 1
  let pending = captures.get(scale)
  if (!pending) {
    pending = capture(scale)
    captures.set(scale, pending)
  }
  const image = await pending,
    project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw Error('fixture')
  project.id = name
  project.name = 'A Vila e a Floresta — regiões'
  project.installedExtensions = [{ ...PYGAME_EXTENSION, installedAt: project.createdAt }]
  project.python.entrypoint = 'main.py'
  project.assets = [
    {
      id: 'vila-regional',
      name: 'vila-regional',
      kind: 'image',
      source: 'library',
      libOrigin: 'pinta',
      libId: 'personal:vila-regional',
      libRevision: 1,
      proPath: 'assets/vila-regional.png',
      dataUrl: `data:image/png;base64,${Buffer.from(image.png).toString('base64')}`,
      width: image.width,
      height: image.height,
    },
  ]
  for (const direction of [1, -1] as const) {
    const id = direction === 1 ? 'platform-positive' : 'platform-negative'
    project.assets.push({
      id,
      name: id,
      kind: 'image',
      source: 'library',
      proPath: `assets/${id}.png`,
      dataUrl: `data:image/png;base64,${Buffer.from(await regionPlatformPng(direction)).toString('base64')}`,
      width: 16,
      height: 16,
    })
  }
  project.tree = pythonFilesToTree({
    'main.py': `import sys,json,tempfile,pygame,pinta
from pathlib import Path
assert sys.platform=='emscripten', sys.platform
_imagem_em_memoria=pinta._imagem_em_memoria
${moduleSource}
pygame.init()
tela=pygame.display.set_mode((640,480))
clock=pygame.time.Clock()
for direction in (1,-1):
    asset='platform-positive' if direction>0 else 'platform-negative'
    with CenarioRegionalPygame(Path(pinta._caminho(asset)).read_bytes()) as platform:
        previous=pygame.FRect(2,99990 if direction>0 else -99996,4,6)
        desired=pygame.FRect(2,99997 if direction>0 else -100003,4,6)
        landed=platform.pouso(previous,desired,direction)
        assert landed is not None
        expected=100000.004-6 if direction>0 else -100000.004
        for frame in range(20):
            assert abs(landed.y-expected)<0.01
            landed=platform.pouso(landed,landed.move(0,direction*0.05),direction)
            assert landed is not None, 'Float32 lost distant platform support'
root=CenarioRegionalPygame(Path(pinta._caminho('vila-regional')).read_bytes())
assert root.cena.fisica=='legacy'
assert len(root.cena._scene['layers'])==18
assert tuple(root.ponto_inicial())==(${32 * scale},${32 * scale})
assert root.limites.width==${160000 * scale} and root.limites.x==${-1024 * scale}
assert not list(Path(tempfile.gettempdir()).glob('pinta-image-*'))
door=next(obj for obj in root.objetos() if obj.get('role')=='door')
child=root.abrir_destino(door)
assert child.cena._scene['name']=='cabana'
back=child.abrir_destino(next(obj for obj in child.objetos() if obj.get('role')=='door'))
assert back.cena.mapa_id==root.cena.mapa_id
assert back._renderizador is root._renderizador is child._renderizador
back.descartar()
child.descartar()
frames=[]
for elapsed in (0,200):
    probe=pygame.Surface((640,480),pygame.SRCALPHA)
    root.desenhar(probe,tempo=elapsed)
    frames.append(pygame.image.tobytes(probe,'RGBA'))
assert frames[0]!=frames[1], 'Regional animation did not change pixels'
print('regional-runtime',json.dumps({'platform':sys.platform,'python':sys.version,'pygame':pygame.version.ver,'scale':${scale},'layers':18,'scene':4,'png':5,'width':root.limites.width,'sharedResources':True,'animation':True,'float32SupportFrames':40}),flush=True)
print('regional-ready',${scale},flush=True)
current=root
while True:
    for event in pygame.event.get():
        if event.type==pygame.QUIT:
            current.descartar()
            root.descartar()
            raise SystemExit
        if event.type==pygame.KEYDOWN and event.key==pygame.K_RETURN:
            target=current.abrir_destino(next(obj for obj in current.objetos() if obj.get('role')=='door'))
            if current is not root: current.descartar()
            current=target
            print('regional-place',current.cena._scene['name'],flush=True)
    tela.fill((19,28,46))
    current.desenhar(tela)
    x,y=current.ponto_inicial()
    pygame.draw.rect(tela,'white',(x,y,10*${scale},10*${scale}))
    current.desenhar(tela,frente=True)
    pygame.display.flip()
    clock.tick(30)
`,
  })
  return project
}
