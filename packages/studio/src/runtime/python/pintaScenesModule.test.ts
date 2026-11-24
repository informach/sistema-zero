import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  PYTHON_PINTA_REGIONS_FEATURE,
  PYTHON_PINTA_SCENE_MODULE_MAX_BYTES,
} from '@sistemazero/core/studio/python-runtime-features'
import {
  pintaBrowser2dProject,
  pintaSceneAssetPath,
} from '../../../../../experiments/studio-python-runtime/pintaBrowser2dFixtures'
import { pythonRequiredInCi, warnSkippedInCi } from '../../../../pinta/src/testing/ciPython'
import { buildPythonSourceFiles } from '../../export/pythonSource'
import { pythonOfficialModules } from '../../python/officialModules'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { PGZERO_EXTENSION } from './pgzero/contract'
import { PYGAME_EXTENSION } from './pygame/contract'
import { PYGAME_DESKTOP_SOURCES } from './pygame/desktopSources.generated'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from './raylib/contract'

const features = [PYTHON_PINTA_REGIONS_FEATURE]
const environment = {
  ...process.env,
  PYGAME_HIDE_SUPPORT_PROMPT: '1',
  SDL_VIDEODRIVER: 'dummy',
  SDL_AUDIODRIVER: 'dummy',
}
const native = process.env.PYTHON ?? 'python'
const raylib = process.env.PINTA_RAYLIB_PYTHON
warnSkippedInCi(
  raylib,
  'A prova nativa do módulo de cenários no Raylib 2D pulou: o CI não tem raylib com janela (PINTA_RAYLIB_PYTHON).',
)
const pygame = pythonRequiredInCi(
  spawnSync(native, ['-I', '-c', 'import pygame, pgzero.screen'], {
    env: environment,
    timeout: 5000,
  }).status === 0
    ? native
    : undefined,
)

/** `recusa` is where the Studio panel put the broken world for this extension. */
const shared = (recusa: string) => `from pathlib import Path
import pinta
assert Path(pinta.__file__).resolve() == Path('pinta.py').resolve()
assert pinta.carregar_cenario.__module__ == 'pinta'
game = pinta.carregar_cenario('mundo')
assert game.limites == (-1024, -1024, 160000, 160000)
assert game.ponto_inicial() == (32,32)
old = game.cena
renderer = game._renderizador
try:
    game.substituir(Path('${recusa}'))
except ValueError:
    pass
else:
    raise AssertionError('recurso quebrado substituiu a cena')
assert game.cena is old and game._renderizador is renderer
with game.abrir_destino(game.objeto_por_id('door')) as outro:
    assert outro.cena.mapa_id == 'cabana'
    assert outro._renderizador is renderer
    assert pixel(outro,48,32) == (105,76,56)
    assert pixel(outro,49,33) == (161,135,82)
    with outro.abrir_destino(outro.objeto_por_id('cabana-saida')) as volta:
        assert volta.cena.mapa_id == game.cena.mapa_id
    with pinta.carregar_cenario('mundo', lugar='cabana') as by_id:
        assert pixel(by_id,48,32) == (105,76,56)
game.descartar()
print('Módulo nativo verificado',pinta.__file__)
`
function sdl(ce: boolean, recusa: string) {
  return `import pygame
${ce ? '' : 'from pgzero.screen import Screen'}
def pixel(cena,x,y):
    surface = pygame.Surface((160,96),pygame.SRCALPHA)
    target = ${ce ? 'surface' : 'Screen(surface)'}
    cena.desenhar(target,tempo=135)
    cena.desenhar(target,frente=True,tempo=135)
    return tuple(surface.get_at((x,y)))[:3]

${shared(recusa)}
${ce ? 'assert callable(pinta.carregar_mapa) and callable(pinta.fonte)' : pgzeroRoot}
`
}
// Pygame Zero opens `Actor('vila')` from images/ next to the MAIN file (pgzero.loaders.root,
// e.g. src/images/ when the main file is src/main.py). A bare scenario name follows the same root.
const pgzeroRoot = `assert not hasattr(pinta,'carregar_mapa')
import os, shutil, tempfile, pgzero.loaders
with tempfile.TemporaryDirectory() as pasta:
    os.mkdir(os.path.join(pasta, 'images'))
    shutil.copy('images/mundo.png', os.path.join(pasta, 'images', 'mundo.png'))
    pgzero.loaders.set_root(os.path.join(pasta, 'main.py'))
    try:
        with pinta.carregar_cenario('mundo') as outra_raiz:
            assert outra_raiz.ponto_inicial() == (32,32)
    finally:
        pgzero.loaders.set_root('main.py')
print('Raiz do Pygame Zero seguida')`
const ray = (recusa: string) => `import pyray as ray
ray.set_config_flags(ray.FLAG_WINDOW_HIDDEN)
ray.init_window(160,96,'prova do módulo Pinta')
target = ray.load_render_texture(160,96)

def pixel(cena,x,y):
    ray.begin_texture_mode(target)
    ray.clear_background(ray.BLACK)
    cena.desenhar(tempo=135,viewport=(160,96))
    cena.desenhar(frente=True,tempo=135,viewport=(160,96))
    ray.end_texture_mode()
    image = ray.load_image_from_texture(target.texture)
    try:
        c=ray.get_image_color(image,x,95-y)
        return c.r,c.g,c.b
    finally:
        ray.unload_image(image)

def grid(cena,camera,mode_2d=None):
    ray.begin_texture_mode(target)
    ray.clear_background(ray.BLACK)
    if mode_2d is not None:
        ray.begin_mode_2d(mode_2d)
    cena.desenhar(camera=camera,tempo=135,viewport=(160,96))
    cena.desenhar(camera=camera,frente=True,tempo=135,viewport=(160,96))
    if mode_2d is not None:
        ray.end_mode_2d()
    ray.end_texture_mode()
    image = ray.load_image_from_texture(target.texture)
    try:
        return [tuple(getattr(ray.get_image_color(image,x,y),k) for k in 'rgb')
                for y in range(0,96,4) for x in range(0,160,4)]
    finally:
        ray.unload_image(image)

try:
${shared(recusa)
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
    with pinta.carregar_cenario('mundo') as cena:
        # pyray's Rectangle is a C struct: read by its fields, never unpacked.
        for box in ((-2000,-2000,8,8),(40,40,8,8),(32,32,4,4)):
            assert cena.bloqueado(ray.Rectangle(*box)) == cena.bloqueado(box), box
        assert cena.bloqueado(ray.Rectangle(-2000,-2000,8,8))
        # Inside begin_mode_2d the Camera2D draws what the pair camera draws outside it.
        for focus in ((16,8),(-40,-24)):
            reference = grid(cena,focus)
            assert any(color != (0,0,0) for color in reference), focus
            camera = ray.Camera2D((0,0),focus,0,1)
            assert grid(cena,camera,camera) == reference, focus
    print('Rectangle e Camera2D do raylib aceitos')
finally:
    ray.unload_render_texture(target)
    ray.close_window()
`

async function projectFor(extension: { id: string; version: string }, body: string) {
  const project = await pintaBrowser2dProject('pinta-regional-pgzero-fornecido')
  const { project: approved, environment } = await pythonEnvironmentFixture('pro', features)
  project.runtime = approved.runtime
  project.python.dependencyLock = approved.python.dependencyLock
  project.installedExtensions = [{ ...extension, installedAt: project.createdAt }]
  project.assets = (project.assets ?? []).map((asset) => {
    if (!asset || typeof asset !== 'object' || !('name' in asset) || typeof asset.name !== 'string')
      throw new Error('Material da fixture sem nome')
    return { ...asset, proPath: pintaSceneAssetPath(extension.id, asset.name) }
  })
  project.tree = { 'main.py': { kind: 'file', content: body } }
  const validated = await refinePythonProjectDocument(project)
  if (validated.kind !== 'pro') throw new Error('Projeto profissional esperado')
  return { project: validated, catalog: environment.catalog }
}

test('the desktop module is selected only by the pinned release and exact active 2D extension', async () => {
  for (const extension of [
    PYGAME_EXTENSION,
    PGZERO_EXTENSION,
    RAYLIB_2D_EXTENSION,
    RAYLIB_3D_EXTENSION,
  ]) {
    const { project, catalog } = await projectFor(extension, 'import pinta\n')
    const known = await buildPythonSourceFiles(project, catalog)
    const unsupported = await buildPythonSourceFiles(project)
    expect(known.files['main.py']).toBe('import pinta\n')
    expect(unsupported.files['pinta.py']).toBe(
      extension.id === PYGAME_EXTENSION.id ? PYGAME_DESKTOP_SOURCES['pinta.py'] : undefined,
    )
    const official = pythonOfficialModules(project, features)
    expect(official.has('pinta')).toBe(extension.id !== RAYLIB_3D_EXTENSION.id)
    const source = known.files['pinta.py']
    if (extension.id === RAYLIB_3D_EXTENSION.id) expect(source).toBeUndefined()
    else {
      if (typeof source !== 'string') throw new Error('Módulo de cenários ausente')
      expect(source).toContain('def carregar_cenario')
      expect(new TextEncoder().encode(source).byteLength).toBeLessThan(
        PYTHON_PINTA_SCENE_MODULE_MAX_BYTES,
      )
      if (extension.id === PYGAME_EXTENSION.id)
        expect(source.startsWith(PYGAME_DESKTOP_SOURCES['pinta.py'])).toBe(true)
      expect(source).not.toContain('_pinta_pgzero_transport')
      expect(source).not.toContain('_pinta_raylib_transport')
    }
    project.tree['pinta.py'] = { kind: 'file', content: 'MARCA = "autoral"\n' }
    const shadow = await buildPythonSourceFiles(project, catalog)
    expect(shadow.files['pinta.py']).toBe('MARCA = "autoral"\n')
    expect(pythonOfficialModules(project, features).has('pinta')).toBe(false)
  }
})

const recusa = (extension: { id: string }) => pintaSceneAssetPath(extension.id, 'recusa')
for (const { extension, body, python } of [
  {
    extension: PYGAME_EXTENSION,
    body: sdl(true, recusa(PYGAME_EXTENSION)),
    python: pygame,
  },
  {
    extension: PGZERO_EXTENSION,
    body: sdl(false, recusa(PGZERO_EXTENSION)),
    python: pygame,
  },
  { extension: RAYLIB_2D_EXTENSION, body: ray(recusa(RAYLIB_2D_EXTENSION)), python: raylib },
])
  test.skipIf(!python)(
    `${extension.id} runs the supplied desktop module against real Vila and Cabana PNGs`,
    async () => {
      const { project, catalog } = await projectFor(extension, body)
      const { files } = await buildPythonSourceFiles(project, catalog)
      expect(files['main.py']).toBe(body)
      // The PNGs go where the panel puts them: `assets/` in Pygame-ce, `images/` in the others.
      const pngs = ['mundo', 'recusa'].map((name) => pintaSceneAssetPath(extension.id, name))
      const root = mkdtempSync(join(tmpdir(), 'pinta-module-'))
      const assets = join(root, pngs[0]!.slice(0, pngs[0]!.lastIndexOf('/')))
      const written: string[] = []
      mkdirSync(assets)
      try {
        for (const name of ['main.py', 'pinta.py', ...pngs]) {
          const content = files[name]
          if (content === undefined) throw new Error(`Arquivo empacotado ausente: ${name}`)
          const path = join(root, name)
          writeFileSync(path, content, { flag: 'wx' })
          written.push(path)
        }
        const result = spawnSync(python!, ['-E', '-B', '-X', 'utf8', 'main.py'], {
          cwd: root,
          env: environment,
          timeout: 20_000,
          encoding: 'utf8',
        })
        expect(result.status, `${result.stdout}\n${result.stderr}\n${result.error ?? ''}`).toBe(0)
        expect(result.stdout).toContain('Módulo nativo verificado')
        if (extension.id === PGZERO_EXTENSION.id)
          expect(result.stdout).toContain('Raiz do Pygame Zero seguida')
        if (extension.id === RAYLIB_2D_EXTENSION.id)
          expect(result.stdout).toContain('Rectangle e Camera2D do raylib aceitos')
      } finally {
        for (const path of written) unlinkSync(path)
        rmdirSync(assets)
        rmdirSync(root)
      }
    },
  )
