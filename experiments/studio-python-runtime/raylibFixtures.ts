import { readdirSync, readFileSync } from 'node:fs'
import { sep } from 'node:path'
import { RAYLIB_GAME_LOADERS } from '../../packages/studio/src/examples/python/raylibGames.loaders.generated'
import {
  RAYLIB_GAMES,
  type RaylibGameKey,
} from '../../packages/studio/src/examples/python/raylibGames.manifest'
import {
  RAYLIB_2D_EXTENSION,
  RAYLIB_3D_EXTENSION,
} from '../../packages/studio/src/runtime/python/raylib/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { PGZERO_FIXTURE_ASSETS } from './pgzeroFixtures'

const scenes = new URL('../../packages/studio/scripts/raylib/scenes/', import.meta.url)

/** Every scene file in scripts/raylib/scenes, as `raylibScene<Name>` (shapes2d → raylibSceneShapes2d). */
export const RAYLIB_SCENES = readdirSync(scenes)
  .filter((file) => file.endsWith('.py') && file !== 'make_references.py')
  .map((file) => file.slice(0, -3))
  .sort()

const sceneFixtures = Object.fromEntries(
  RAYLIB_SCENES.map((name) => [
    `raylibScene${name[0]!.toUpperCase()}${name.slice(1)}`,
    readFileSync(new URL(`${name}.py`, scenes), 'utf8'),
  ]),
)

const SCENE_ASSET_TYPES: Record<
  string,
  { kind: 'image' | 'audio' | 'font' | 'model3d'; mime: string }
> = {
  png: { kind: 'image', mime: 'image/png' },
  glb: { kind: 'model3d', mime: 'model/gltf-binary' },
  wav: { kind: 'audio', mime: 'audio/wav' },
  ttf: { kind: 'font', mime: 'font/ttf' },
  otf: { kind: 'font', mime: 'font/otf' },
}

/** The files the scenes open (scenes/assets/<pasta>/<arquivo>), at the same path in the project. */
const SCENE_ASSETS = readdirSync(new URL('assets/', scenes), { recursive: true, encoding: 'utf8' })
  .map((file) => file.split(sep).join('/'))
  .flatMap((path) => {
    const type = SCENE_ASSET_TYPES[path.split('.').pop()!.toLowerCase()]
    if (!type) return []
    const fileName = path.split('/').pop()!
    const bytes = readFileSync(new URL(`assets/${path}`, scenes))
    return [
      {
        id: `cena-${fileName}`,
        name: `cena-${fileName.replace(/\.[^.]+$/, '').toLowerCase()}`,
        kind: type.kind,
        source: 'upload' as const,
        proPath: path,
        originalFileName: fileName,
        dataUrl: `data:${type.mime};base64,${bytes.toString('base64')}`,
      },
    ]
  })

/** Behavioral Raylib fixtures: the learner's own loop, shapes, textures, text, input and sound. */
export const raylibFixtures: Record<string, string> = {
  /** Cenas-gabarito: the same file runs on the desktop raylib (take_screenshot) and here. */
  ...sceneFixtures,
  raylibGame: `from pyray import *
from os.path import join

init_window(320, 240, 'Teste Raylib')
init_audio_device()
heroi = load_texture(join('images', 'heroi.png'))
imagem = gen_image_color(16, 8, (255, 0, 255, 255))
roxo = load_texture_from_image(imagem)
bip = load_sound(join('sounds', 'bip.wav'))
camera = Camera2D()
camera.zoom = 1
pontos = 0
quadros = 0
print('pronto', heroi.width, heroi.height, measure_text('Pontos', 20))
while not window_should_close():
    quadros += 1
    if is_key_pressed(KEY_SPACE):
        pontos += 1
        play_sound(bip)
        print('espaco', pontos)
    if is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        p = get_mouse_position()
        print('clique', int(p.x), int(p.y))
    if quadros == 30:
        print('quadros-30', round(get_frame_time(), 3) > 0, get_time() > 0.3)
    begin_drawing()
    clear_background((30, 60, 120, 255))
    draw_rectangle(20, 180, 60, 30, YELLOW)
    draw_circle(280, 40, 20, WHITE)
    draw_line(0, 0, 320, 240, RED)
    begin_mode_2d(camera)
    draw_texture(heroi, 144, 104, WHITE)
    end_mode_2d()
    draw_texture(roxo, 200, 200, WHITE)
    draw_text(f'Pontos: {pontos}', 10, 10, 20, WHITE)
    end_drawing()
close_window()
`,
}

/** The Pygame Zero fixture images and sound, at the folders a raylib game names. */
export const RAYLIB_FIXTURE_ASSETS = [
  ...PGZERO_FIXTURE_ASSETS.filter((asset) => asset.id !== 'estrela').map((asset) => ({
    ...asset,
    proPath: asset.proPath.replace('src/', ''),
  })),
  ...SCENE_ASSETS,
]
export { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION }

/** A scene named `...3d` (shapes3d, models3d) runs with the Raylib 3D extension. */
export function raylibFixtureExtension(name: string) {
  return /3d$/i.test(name) ? RAYLIB_3D_EXTENSION : RAYLIB_2D_EXTENSION
}

/** `raylib-example-<key>`: the gallery example itself, as a Pro project at the same paths. */
export function isRaylibExampleFixture(name: string) {
  return name.startsWith('raylib-example-') && name.slice(15) in RAYLIB_GAME_LOADERS
}
export async function raylibExampleProject(name: string) {
  const key = name.slice(15) as RaylibGameKey
  const payload = await RAYLIB_GAME_LOADERS[key]()
  const game = RAYLIB_GAMES.find((entry) => entry.key === key)!
  const extension = (game.extension as string) === '3d' ? RAYLIB_3D_EXTENSION : RAYLIB_2D_EXTENSION
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.id = name
  project.name = key
  project.python.entrypoint = payload.entrypoint
  project.tree = Object.fromEntries(
    Object.entries(payload.files).map(([path, content]) => [path, { kind: 'file', content }]),
  )
  project.assets = [...payload.assets]
  project.installedExtensions = [{ ...extension, installedAt: project.createdAt }]
  return project
}
