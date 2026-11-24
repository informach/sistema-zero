/**
 * Sonda da física antiga no Pygame CE (não é um ensaio de aprovação).
 *
 *   PINTA_PYTHON_BIN=<python com pygame-ce> bun <esta pasta>/pygame-fisica-antiga-sonda.ts
 *
 * Usa a Vila com plataforma de `verify-region-pygame.ts`, sem a física precisa, e mostra como
 * o jogo do pacote anda e o que o módulo responde sobre a peça de plataforma e o pouso.
 */
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { nativeImageOf } from '../../../../../packages/pinta/scripts/homologacao/generate'
import { buildScenePackage } from '../../../../../packages/pinta/src/export/scenePackage'
import { regionVilaPlatform } from '../../../../../packages/pinta/src/testing/regionVilaPlatform'

const { map, assets } = regionVilaPlatform()
const files = await buildScenePackage({ ...map, physics: undefined }, assets, 'pygame', {
  imageOf: nativeImageOf,
})
const folder = await mkdtemp(join(tmpdir(), 'pinta-pygame-legacy-'))
try {
  await Promise.all(
    Object.entries(files).map(([path, data]) => Bun.write(join(folder, path), data)),
  )
  const run = Bun.spawn(
    [
      process.env.PINTA_PYTHON_BIN ?? 'python',
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
        inicio = tuple(jogo.corpo.center)
        for _ in range(60):
            jogo.mover(0, 0, 1 / 60)
        parado = jogo.corpo.centery
        for _ in range(60):
            jogo.mover(0, 1, 1 / 60)
        descendo = jogo.corpo.centery
        jogo.corpo.center = (8, -45)
        for _ in range(60):
            jogo.mover(0, -1, 1 / 60)
        subindo = jogo.corpo.centery
        sobre_plataforma = cena.bloqueado(pygame.FRect(2, -66, 8, 8))
        sobre_solido = cena.bloqueado(pygame.FRect(2, -33, 8, 8))
        pouso = cena.pouso(pygame.FRect(2, -80, 8, 8), pygame.FRect(2, -60, 8, 8))
        print(json.dumps({'fisica': cena.cena.fisica, 'plataforma': jogo.plataforma, 'inicio': inicio,
                          'apos_60_quadros_parado': parado, 'apos_descer': descendo, 'apos_subir': subindo,
                          'bloqueio_na_plataforma': sobre_plataforma, 'bloqueio_no_solido': sobre_solido,
                          'pouso': None if pouso is None else tuple(pouso)}))
finally:
    pygame.quit()`,
    ],
    {
      cwd: folder,
      env: {
        ...process.env,
        SDL_VIDEODRIVER: 'dummy',
        SDL_AUDIODRIVER: 'dummy',
        PYGAME_HIDE_SUPPORT_PROMPT: '1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [code, out, err] = await Promise.all([
    run.exited,
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
  ])
  console.log(out.trim(), err.trim())
  assert.equal(code, 0)
} finally {
  await rm(folder, { recursive: true, force: true })
}
