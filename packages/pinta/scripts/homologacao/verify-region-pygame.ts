import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTileLayer } from '../../src/core/project'
import { buildScenePackage } from '../../src/export/scenePackage'
import { regionVilaPlatform } from '../../src/testing/regionVilaPlatform'
import { setCell } from '../../src/tiles/tilemapOps'
import { nativeImageOf } from './generate'

const { map, assets } = regionVilaPlatform()
const front = map.layers.find((layer) => isTileLayer(layer) && layer.front)
if (!front) throw new Error('Camada da frente ausente.')
const options = { imageOf: nativeImageOf }
const files = await buildScenePackage(setCell(map, front.id, -1, -1, 16), assets, 'pygame', options)
const edited = await buildScenePackage(
  setCell(map, front.id, -1, -1, 19),
  assets,
  'pygame',
  options,
)
const png = edited['cenario.png']
if (!(png instanceof Uint8Array)) throw new Error('Cenário atualizado ausente.')
const prefix = join(tmpdir(), 'pinta-pygame-region-')
const folder = await mkdtemp(prefix)
if (!folder.startsWith(prefix) || dirname(folder) !== dirname(prefix))
  throw new Error('Pasta temporária fora do diretório de homologação.')
try {
  await Promise.all(
    Object.entries(files).map(([path, data]) => Bun.write(join(folder, path), data)),
  )
  await Bun.write(join(folder, 'atualizado.png'), png)
  await Bun.write(join(folder, 'invalido.png'), png.subarray(0, 24))
  async function python(args: string[]) {
    const run = Bun.spawn([process.env.PINTA_PYTHON_BIN ?? 'python', ...args], {
      cwd: folder,
      env: {
        ...process.env,
        SDL_VIDEODRIVER: 'dummy',
        SDL_AUDIODRIVER: 'dummy',
        PYGAME_HIDE_SUPPORT_PROMPT: '1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [code, out, err] = await Promise.all([
      run.exited,
      new Response(run.stdout).text(),
      new Response(run.stderr).text(),
    ])
    assert.equal(code, 0, out + err)
    console.log(out.trim())
  }
  await python(['main.py', '--frames', '8', '--screenshot', 'captura.png'])
  assert.ok(Bun.file(join(folder, 'captura.png')).size > 1_000)
  await python([
    '-c',
    `import sys
import json
import pygame
from main import Jogo
from pinta_cenario import carregar_cenario

pygame.init()
try:
    tela = pygame.display.set_mode((640, 480))
    with carregar_cenario('cenario.png') as cena:
        jogo = Jogo(cena)
        assert tuple(cena.limites[:2]) == (-1024, -1024), cena.limites
        assert jogo.plataforma and tuple(jogo.corpo.center) == (8, -45)
        assert cena.propriedade_peca('vila-pecas', 0, 'atrito') == .8
        assert cena.objeto_por_id('morador-obj')['properties']['porta']['value'] == 'door'
        for _ in range(60):
            jogo.mover(0, 0, 1 / 60)
        assert -39 < jogo.corpo.centery < -37, jogo.corpo
        jogo.mover(0, -1, 1 / 60)
        apex = jogo.corpo.centery
        for _ in range(120):
            jogo.mover(0, 0, 1 / 60)
            apex = min(apex, jogo.corpo.centery)
        assert apex < -72 and abs(jogo.corpo.centery + 70) < 1e-4, (apex, jogo.corpo)
        jogo.desenhar(tela)
        assert tela.get_at((320, 240))[:3] == (74, 222, 128)
        jogo.corpo.center = (88, -40)
        jogo.mover(0, 0, 0)
        assert cena.cena.mapa_id == 'cabana', cena.cena.mapa_id
        def sample(lugar, frente, offset, point):
            tela.fill((232, 237, 244))
            lugar.desenhar(tela, offset, frente=frente, tempo=0)
            return tuple(tela.get_at(point))[:3]
        with cena.abrir_lugar('cabana') as held_cabin:
            assert sample(held_cabin, False, (0, 0), (10, 10)) == (161, 135, 82)
            cena.carregar('vila-e-floresta')
            assert sample(cena, True, (328, 248), (320, 240)) == (201, 181, 122)
            try:
                cena.substituir('invalido.png')
            except ValueError:
                pass
            else:
                raise AssertionError('O PNG incompleto foi aceito.')
            assert sample(cena, True, (328, 248), (320, 240)) == (201, 181, 122)
            cena.substituir('atualizado.png')
            assert sample(cena, True, (328, 248), (320, 240)) == (216, 148, 105)
            assert sample(held_cabin, False, (0, 0), (10, 10)) == (161, 135, 82)
        print(json.dumps({'python': sys.version.split()[0], 'pygame': pygame.version.ver,
                          'signed': True, 'door': True, 'apex': apex, 'landed': -70,
                          'front_pixels': [(201, 181, 122), (216, 148, 105)], 'update_retained': True}))
finally:
    pygame.quit()`,
  ])
} finally {
  await rm(folder, { recursive: true, force: true })
}
