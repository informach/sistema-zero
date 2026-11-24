import { expect, it, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { pythonRequiredInCi } from '../testing/ciPython'
import { regionVila } from '../testing/regionVila'
import { regionVilaPlatform } from '../testing/regionVilaPlatform'
import { buildPygamePintaScenesModule } from './pythonScenesModuleSource'
import { readPintaRegionImageWorld } from './regionImageWorld'
import { buildScenePackage } from './scenePackage'

test('the regional Pygame package ships the shared provided module and a PNG 5 world', async () => {
  const { map, cabana, assets } = regionVilaPlatform()
  const files = await buildScenePackage(map, assets, 'pygame', { imageOf: nativeImageOf })
  expect(files['pinta_cenario.py']).toBe(buildPygamePintaScenesModule())
  expect(files['requirements.txt']).toBe('pygame-ce==2.5.8\n')
  expect(String(files['main.py'])).toContain('from pinta_cenario import carregar_cenario')
  const png = files['cenario.png']
  if (!(png instanceof Uint8Array)) throw new Error('O pacote precisa do cenario.png.')
  // The same complete reader that admits PNG 5 in Studio opens the packaged world.
  const world = readPintaRegionImageWorld(png)
  expect(world.rootId).toBe(map.id)
  expect([...world.maps.keys()].sort()).toEqual([map.id, cabana.id].sort())
  expect(world.maps.get(map.id)?.data.scene.origin).toEqual(map.origin)
  expect(String(files['LEIA-ME.txt'])).toContain('python main.py')
  const damaged = png.slice()
  damaged[damaged.length - 9] = damaged[damaged.length - 9]! ^ 1
  expect(() => readPintaRegionImageWorld(damaged)).toThrow()
})

const python = pythonRequiredInCi(
  [process.env.PYTHON, 'python3', 'python'].find(
    (name) => name && spawnSync(name, ['-I', '-c', 'import pygame']).status === 0,
  ),
)
const cache = resolve(import.meta.dir, '../../../../.cache')
type Point = [x: number, y: number]

/** O jogo do pacote, como a criança o roda, com o cenário exportado na física antiga. */
async function playLegacyPackage({ map, assets }: ReturnType<typeof regionVila>) {
  const files = await buildScenePackage({ ...map, physics: undefined }, assets, 'pygame', {
    imageOf: nativeImageOf,
  })
  await mkdir(cache, { recursive: true })
  const folder = await mkdtemp(join(cache, 'pinta-pygame-package-'))
  if (dirname(folder) !== cache || !basename(folder).startsWith('pinta-pygame-package-'))
    throw Error('Pasta temporária inesperada')
  try {
    await Promise.all(
      Object.entries(files).map(([path, data]) => Bun.write(join(folder, path), data)),
    )
    const run = spawnSync(
      python!,
      [
        '-c',
        `import json
import pygame
from main import Jogo
from pinta_cenario import carregar_cenario
pygame.init()
try:
    pygame.display.set_mode((640, 480))
    with carregar_cenario('cenario.png') as cena:
        jogo = Jogo(cena)
        inicio = list(jogo.corpo.center)
        def andar(horizontal, vertical, quadros):
            for _ in range(quadros):
                jogo.mover(horizontal, vertical, 1 / 60)
            return list(jogo.corpo.center)
        parado = andar(0, 0, 60)
        pulo = andar(0, -1, 1)
        topo = jogo.corpo.centery
        for _ in range(120):
            jogo.mover(0, 0, 1 / 60)
            topo = min(topo, jogo.corpo.centery)
        depois_do_pulo = list(jogo.corpo.center)
        em_cima = andar(0, 0, 60)
        direita = andar(1, 0, 10)
        subir = andar(0, -1, 30)
        print(json.dumps({'fisica': cena.cena.fisica, 'plataforma': jogo.plataforma, 'inicio': inicio,
                          'parado': parado, 'pulo': pulo, 'topo': topo, 'depois_do_pulo': depois_do_pulo,
                          'em_cima': em_cima, 'direita': direita, 'subir': subir,
                          'descer': andar(0, 1, 30)}))
finally:
    pygame.quit()`,
      ],
      {
        cwd: folder,
        encoding: 'utf8',
        timeout: 60_000,
        env: {
          ...process.env,
          SDL_VIDEODRIVER: 'dummy',
          SDL_AUDIODRIVER: 'dummy',
          PYGAME_HIDE_SUPPORT_PROMPT: '1',
        },
      },
    )
    expect(run.status, run.stderr || run.error?.message).toBe(0)
    return JSON.parse(run.stdout) as {
      fisica: string
      plataforma: boolean
      inicio: Point
      parado: Point
      pulo: Point
      topo: number
      depois_do_pulo: Point
      em_cima: Point
      direita: Point
      subir: Point
      descer: Point
    }
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}

it.skipIf(!python)(
  'na física antiga, o jogo do pacote com peças de plataforma tem gravidade, pula através delas e pousa por cima',
  async () => {
    const game = await playLegacyPackage(regionVilaPlatform())
    expect(game.fisica).toBe('legacy')
    // Como no JavaScript: peça de plataforma colocada no lugar escolhe o jogo de plataforma.
    expect(game.plataforma).toBe(true)
    expect(game.inicio).toEqual([8, -45])
    // Parado, cai até o chão sólido da linha -2 (pés em y = -32). O chão sólido para o corpo
    // no último passo livre, como na física de antes: sem entrar nele, a menos de 1 px.
    expect(game.parado[1]).toBeLessThanOrEqual(-38)
    expect(game.parado[1]).toBeGreaterThan(-39)
    // ↑ pula em vez de andar para cima: atravessa a plataforma da linha -4 por baixo...
    expect(game.pulo[1]).toBeLessThan(game.parado[1])
    expect(game.topo).toBeLessThan(-72)
    // ...e pousa por cima dela (pés em y = -64), sem atravessá-la ao cair.
    expect(game.depois_do_pulo[1]).toBeCloseTo(-70, 4)
    expect(game.em_cima[1]).toBeCloseTo(-70, 4)
    // Anda de lado em cima da plataforma.
    expect(game.direita[0]).toBeGreaterThan(game.em_cima[0])
    expect(game.direita[1]).toBeCloseTo(-70, 4)
  },
)

it.skipIf(!python)(
  'na física antiga, o jogo do pacote sem peça de plataforma continua visto de cima, sem gravidade',
  async () => {
    const game = await playLegacyPackage(regionVila())
    expect(game.fisica).toBe('legacy')
    expect(game.plataforma).toBe(false)
    // Sem gravidade: parado, não sai do lugar; ↑ e ↓ andam nas quatro direções, como antes.
    expect(game.parado).toEqual(game.inicio)
    expect(game.pulo[1]).toBeLessThan(game.inicio[1])
    expect(game.depois_do_pulo).toEqual(game.pulo)
    expect(game.direita[0]).toBeGreaterThan(game.em_cima[0])
    expect(game.direita[1]).toBe(game.em_cima[1])
    expect(game.subir[1]).toBeLessThan(game.direita[1])
    expect(game.descer[1]).toBeGreaterThan(game.subir[1])
  },
)
