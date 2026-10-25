import { PYGAME_GAME_EXAMPLES } from '../../packages/studio/src/examples/python/pygameGames'
import { PYGAME_EXTENSION } from '../../packages/studio/src/runtime/python/pygame/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../packages/studio/src/state/pythonProjectValidation'

const prefix = 'pygame-example-'

const UPDATE_NONE = `import pygame
pygame.init()
tela = pygame.display.set_mode((96, 64))
tela.fill('blue')
pygame.display.flip()
tela.fill('red')
pygame.display.update(None)
print('update-none-ready', flush=True)
clock = pygame.time.Clock()
while True:
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
            pygame.display.update()
            print('update-all-ready', flush=True)
    clock.tick(60)
`

/**
 * Frame-rate probe for the browser engine: a 64 px tile map covering the 1280×720 screen
 * (opaque tiles, as pinta.Mapa gives them), a front layer of tiles with transparency, moving
 * sprites with per-pixel alpha, rotozoom and text — the load of the biggest gallery maps.
 * Prints the measured frames per second once a second.
 */
const BENCHMARK = `import pygame, random
pygame.init()
tela = pygame.display.set_mode((1280, 720))
relogio = pygame.time.Clock()
fonte = pygame.font.Font(None, 32)
random.seed(1)
pecas = []
for indice in range(8):
    peca = pygame.Surface((64, 64))
    peca.fill((40 + indice * 20, 120, 60))
    pygame.draw.rect(peca, (20, 60, 30), (0, 0, 64, 64), 2)
    pecas.append(peca.convert())
frente = []
for indice in range(4):
    peca = pygame.Surface((64, 64), pygame.SRCALPHA)
    pygame.draw.circle(peca, (30, 140 + indice * 20, 50, 255), (32, 32), 26)
    frente.append(peca.convert_alpha())
heroi = pygame.Surface((96, 128), pygame.SRCALPHA)
pygame.draw.ellipse(heroi, (230, 120, 60, 255), (8, 8, 80, 112))
heroi = heroi.convert_alpha()
grade = [[random.randrange(8) for _ in range(40)] for _ in range(30)]
copas = [(random.randrange(40), random.randrange(30), random.randrange(4)) for _ in range(160)]
sprites = [[random.uniform(0, 1280), random.uniform(0, 720), random.uniform(-90, 90), random.uniform(-90, 90)] for _ in range(60)]
camera = pygame.Vector2()
quadros = 0
ultimo = pygame.time.get_ticks()
angulo = 0
while True:
    dt = relogio.tick() / 1000
    for evento in pygame.event.get():
        if evento.type == pygame.QUIT:
            raise SystemExit
    camera.x = (camera.x + 60 * dt) % 640
    deslocamento = (-int(camera.x), 0)
    tela.fblits([(pecas[grade[y][x]], (x * 64 + deslocamento[0], y * 64)) for y in range(12) for x in range(31)])
    for x, y, tipo in copas:
        tela.blit(frente[tipo], (x * 64 + deslocamento[0], y * 64))
    for sprite in sprites:
        sprite[0] = (sprite[0] + sprite[2] * dt) % 1280
        sprite[1] = (sprite[1] + sprite[3] * dt) % 720
        tela.blit(heroi, (sprite[0], sprite[1]))
    angulo += 90 * dt
    girado = pygame.transform.rotozoom(heroi, angulo, 1)
    tela.blit(girado, girado.get_rect(center=(640, 360)))
    tela.blit(fonte.render(f'{relogio.get_fps():.0f} fps', True, 'white'), (16, 16))
    pygame.display.flip()
    quadros += 1
    agora = pygame.time.get_ticks()
    if agora - ultimo >= 1000:
        print('fps', round(quadros * 1000 / (agora - ultimo), 1), flush=True)
        quadros = 0
        ultimo = agora
`

/** Runs the same sources and Pinta replaceable media shown in the gallery. */
export function isPygameExampleFixture(name: string) {
  return (
    name === 'pygame-benchmark' ||
    name === 'pygame-update-none' ||
    (name.startsWith(prefix) &&
      PYGAME_GAME_EXAMPLES.some(
        (entry) => entry.key === `python:${name.slice(prefix.length)}:code`,
      ))
  )
}

export async function pygameExampleProject(name: string) {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.id = name
  project.installedExtensions = [{ ...PYGAME_EXTENSION, installedAt: project.createdAt }]
  if (name === 'pygame-benchmark' || name === 'pygame-update-none') {
    project.name = name
    project.python.entrypoint = 'main.py'
    project.tree = pythonFilesToTree({
      'main.py': name === 'pygame-benchmark' ? BENCHMARK : UPDATE_NONE,
    })
    project.assets = []
    return project
  }
  const key = name.slice(prefix.length)
  const example = PYGAME_GAME_EXAMPLES.find((entry) => entry.key === `python:${key}:code`)
  if (!example) throw new Error('Unknown Pygame-ce game')
  const payload = await example.load()
  project.name = key
  project.python.entrypoint = payload.entrypoint
  project.tree = pythonFilesToTree(payload.files)
  project.assets = [...(payload.assets ?? [])]
  return project
}
