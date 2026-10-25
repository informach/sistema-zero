import { PGZERO_GAME_LOADERS } from '../../packages/studio/src/examples/python/pgzeroGames.loaders.generated'
import type { PgzeroGameKey } from '../../packages/studio/src/examples/python/pgzeroGames.manifest'
import { PGZERO_EXTENSION } from '../../packages/studio/src/runtime/python/pgzero/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'

/** `pgzero-example-<key>`: the gallery example itself, as a Pro project at the same paths. */
export function isPgzeroExampleFixture(name: string) {
  return name.startsWith('pgzero-example-') && name.slice(15) in PGZERO_GAME_LOADERS
}
export async function pgzeroExampleProject(name: string) {
  const key = name.slice(15) as PgzeroGameKey
  const payload = await PGZERO_GAME_LOADERS[key]()
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.id = name
  project.name = key
  project.python.entrypoint = payload.entrypoint
  project.tree = Object.fromEntries(
    Object.entries(payload.files).map(([path, content]) => [path, { kind: 'file', content }]),
  )
  project.assets = [...payload.assets]
  project.installedExtensions = [{ ...PGZERO_EXTENSION, installedAt: project.createdAt }]
  return project
}

/** Behavioral Pygame Zero fixtures: real game loop, images, text, input and sound. */
export const pgzeroFixtures: Record<string, string> = {
  pgzeroGame: `import pgzrun
WIDTH = 320
HEIGHT = 240
TITLE = 'Teste Pygame Zero'
heroi = Actor('heroi', (160, 120))
estrela = Actor('estrela', (60, 120))
pontos = 0
quadros = 0
caixa = Rect((20, 180), (60, 30))

def draw():
    screen.fill((30, 60, 120))
    screen.draw.filled_rect(caixa, 'yellow')
    screen.draw.circle((280, 40), 20, 'white')
    screen.draw.line((0, 0), (320, 240), (255, 0, 0))
    heroi.draw()
    estrela.draw()
    screen.draw.text('Pontos: ' + str(pontos), (10, 10), color='white', fontsize=24)

def update():
    global quadros
    quadros += 1
    heroi.angle += 2
    if keyboard.right:
        heroi.x += 4
    if quadros == 30:
        print('quadros-30', heroi.width, heroi.height, images.heroi.get_at((16, 16)))
        print('estrela', estrela.width, estrela.height, images.estrela.get_at((20, 20)), images.estrela.get_at((1, 1)))

def on_key_down(key):
    global pontos
    if key == keys.SPACE:
        pontos += 1
        sounds.bip.play()
        print('espaco', pontos)

def on_mouse_down(pos):
    print('clique', pos, heroi.collidepoint(pos))

def marcar():
    print('relogio', quadros > 0)

clock.schedule_unique(marcar, 0.5)
print('pronto', heroi.pos)
pgzrun.go()
`,
  // Two saves close together, then an error: the run ends, and both still reach the host.
  pgzeroSavesThenFails: `with open('primeiro.txt', 'w') as arquivo:
    arquivo.write('1')
with open('segundo.txt', 'w') as arquivo:
    arquivo.write('2')
print('gravou', 1 / 0)
`,
  // The engine's part of pygame, tone, and files the game saves for the next run.
  pgzeroSavesFiles: `import os
from pathlib import Path
import pgzrun
import pygame

WIDTH = 200
HEIGHT = 100
vezes = 0
if os.path.exists('contador.txt'):
    with open('contador.txt') as arquivo:
        vezes = int(arquivo.read())
antes = Path('dados/nome.txt').read_text() if vezes else '-'
vezes = vezes + 1
with open('contador.txt', 'w') as arquivo:
    arquivo.write(str(vezes))
Path('dados').mkdir(exist_ok=True)
Path('dados/nome.txt').write_text('Ana ' + str(vezes))
print('aberto', vezes, 'antes', antes)
nota = tone.create('A4', 0.3)
lido = False


def draw():
    global lido
    screen.fill((0, 0, 0))
    pygame.draw.circle(screen.surface, (255, 0, 0), (50, 50), 20)
    pygame.draw.polygon(screen.surface, (0, 255, 0), [(120, 20), (180, 20), (150, 80)])
    if not lido:
        lido = True
        cores = [tuple(screen.surface.get_at(ponto)) for ponto in [(50, 50), (150, 35), (10, 90)]]
        print('pixels', cores)
        nota.play()


pgzrun.go()
`,
}

export const PGZERO_FIXTURE_ASSETS = [
  {
    id: 'heroi',
    name: 'heroi',
    kind: 'image' as const,
    source: 'upload' as const,
    proPath: 'src/images/heroi.png',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAfElEQVR4nO3VQQrAIAxE0Rwnh+2dFReFUqyYZIZgyUDW/61UpGZcu6StLi1Mg1jDUEg0Pk5VfQhE/AaYEaj4E7CNQMbfgC1EKgAdnwGWiFQAI/4FmCIKUIACpANYiHNeQhbirN+QgTDH0QhXHIlwx1GIUDwCgYWtEFr4t+uS6rU8mOKQewAAAABJRU5ErkJggg==',
  },
  {
    id: 'estrela',
    name: 'estrela',
    kind: 'image' as const,
    source: 'upload' as const,
    proPath: 'src/images/estrela.svg',
    dataUrl:
      'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%3E%3Cpolygon%20points%3D%2220%2C2%2025%2C15%2038%2C15%2027%2C23%2031%2C37%2020%2C29%209%2C37%2013%2C23%202%2C15%2015%2C15%22%20fill%3D%22%2322cc44%22%2F%3E%3C%2Fsvg%3E',
  },
  {
    id: 'bip',
    name: 'bip',
    kind: 'audio' as const,
    source: 'upload' as const,
    proPath: 'src/sounds/bip.wav',
    dataUrl:
      'data:audio/wav;base64,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',
  },
]
export { PGZERO_EXTENSION }
