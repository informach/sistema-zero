import { expect, test } from 'bun:test'
import { PGZERO_EXTENSION } from '../runtime/python/pgzero/contract'
import { TURTLE_EXTENSION } from '../runtime/python/turtle/contract'
import { documentFixture } from '../state/fixtures/projectDocuments'
import { createProjectStore } from '../state/projectStore'
import { refinePythonProjectDocument } from '../state/pythonProjectValidation'
import {
  PGZERO_EXTENSION_ID,
  pgzeroFileStem,
  pgzeroMediaFolder,
  pgzeroMediaPath,
  projectUsesPgzero,
} from './pgzeroMediaPaths'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"/>')}`
const WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZF'
const MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAA'
const OGG = 'data:audio/ogg;base64,T2dnUwACAAAA'
const M4A = 'data:audio/mp4;base64,AAAAGGZ0eXA='

async function pythonStore(kind: 'classic' | 'pro', extension?: { id: string; version: string }) {
  const store = createProjectStore()
  const raw = documentFixture('python', kind)
  raw.assets = []
  if (extension) raw.installedExtensions = [{ ...extension, installedAt: 1 }]
  store.getState().hydrateProject(await refinePythonProjectDocument(raw))
  return store
}
const paths = (store: Awaited<ReturnType<typeof pythonStore>>) =>
  (store.getState().project?.assets ?? []).map((asset) => asset.proPath)

test('the pure id stays the runtime contract id', () => {
  expect(PGZERO_EXTENSION_ID).toBe(PGZERO_EXTENSION.id)
  expect(projectUsesPgzero({ installedExtensions: [PGZERO_EXTENSION] })).toBe(true)
  expect(projectUsesPgzero({ installedExtensions: [TURTLE_EXTENSION] })).toBe(false)
  expect(projectUsesPgzero({})).toBe(false)
})

test('file names follow Pygame Zero: lowercase letters, digits and _, starting with a letter', () => {
  expect(pgzeroFileStem('nave-azul', 'images')).toBe('nave_azul')
  expect(pgzeroFileStem('Herói Grande', 'images')).toBe('heroi_grande')
  expect(pgzeroFileStem('Pulo!!', 'sounds')).toBe('pulo')
  expect(pgzeroFileStem('8-bits', 'images')).toBe('imagem_8_bits')
  expect(pgzeroFileStem('2', 'sounds')).toBe('som_2')
  expect(pgzeroFileStem('---', 'music')).toBe('musica')
  for (const stem of ['nave_azul', 'heroi_grande', 'imagem_8_bits', 'som_2', 'musica'])
    expect(stem).toMatch(/^[a-z][a-z0-9_]*$/)
})

test('folders: images; wav/ogg sounds, mp3/ogg music; the child choice wins when the format fits', () => {
  expect(pgzeroMediaFolder('image', 'png')).toEqual({ folder: 'images' })
  expect(pgzeroMediaFolder('image', 'svg')).toEqual({ folder: 'images' })
  expect(pgzeroMediaFolder('image', 'webp')).toHaveProperty('error')
  expect(pgzeroMediaFolder('audio', 'wav')).toEqual({ folder: 'sounds' })
  expect(pgzeroMediaFolder('audio', 'mp3')).toEqual({ folder: 'music' })
  expect(pgzeroMediaFolder('audio', 'ogg')).toEqual({ folder: 'sounds' })
  expect(pgzeroMediaFolder('audio', 'ogg', 'music')).toEqual({ folder: 'music' })
  expect(pgzeroMediaFolder('audio', 'mp3', 'sound')).toHaveProperty('error')
  expect(pgzeroMediaFolder('audio', 'wav', 'music')).toHaveProperty('error')
  expect(pgzeroMediaFolder('audio', 'm4a')).toHaveProperty('error')
})

test('paths sit next to the main file; a stem in use by ANY extension or a keyword gets _2', () => {
  const occupied = { files: ['main.py', 'images/nave.png'], directories: [] }
  const place = (name: string, extension: string, entrypoint = 'main.py') =>
    pgzeroMediaPath({ entrypoint, name, kind: 'image', extension, occupied })
  // nave.png and nave.svg side by side would make Actor('nave') open the PNG.
  expect(place('nave', 'svg')).toEqual({ path: 'images/nave_2.svg' })
  expect(place('class', 'png')).toEqual({ path: 'images/class_2.png' })
  expect(place('nave', 'svg', 'src/main.py')).toEqual({ path: 'src/images/nave.svg' })
  expect(
    pgzeroMediaPath({
      entrypoint: 'main.py',
      name: 'nave',
      kind: 'image',
      extension: 'png',
      occupied: { files: ['main.py', 'images/nave.svg', 'images/nave_2.gif'], directories: [] },
    }),
  ).toEqual({ path: 'images/nave_3.png' })
  // A folder named like the file is a conflict too.
  expect(
    pgzeroMediaPath({
      entrypoint: 'main.py',
      name: 'pulo',
      kind: 'audio',
      extension: 'wav',
      occupied: { files: ['main.py', 'sounds/pulo.wav/leia.txt'], directories: [] },
    }),
  ).toEqual({ path: 'sounds/pulo_2.wav' })
})

for (const kind of ['classic', 'pro'] as const) {
  const base = kind === 'pro' ? 'src/' : ''
  test(`${kind} Pygame Zero: uploads land in images/, sounds/ and music/ by the Pygame Zero name`, async () => {
    const store = await pythonStore(kind, PGZERO_EXTENSION)
    const add = (input: Parameters<ReturnType<typeof store.getState>['addAsset']>[0]) =>
      store.getState().addAsset(input)
    expect(add({ name: 'nave-azul', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
    expect(add({ name: 'escudo', dataUrl: SVG, width: 8, height: 8 })).toBeNull()
    expect(add({ name: 'pulo', dataUrl: WAV, kind: 'audio' })).toBeNull()
    expect(add({ name: 'tema', dataUrl: MP3, kind: 'audio' })).toBeNull()
    expect(add({ name: 'vento', dataUrl: OGG, kind: 'audio' })).toBeNull()
    expect(add({ name: 'chuva', dataUrl: OGG, kind: 'audio', pgzeroAudio: 'music' })).toBeNull()
    expect(paths(store)).toEqual([
      `${base}images/nave_azul.png`,
      `${base}images/escudo.svg`,
      `${base}sounds/pulo.wav`,
      `${base}music/tema.mp3`,
      `${base}sounds/vento.ogg`,
      `${base}music/chuva.ogg`,
    ])
    // A renamed material keeps its file: a new one with the old name must not hide behind it.
    const first = store.getState().project!.assets![0]!
    expect(store.getState().renameAsset(first.id, 'nave-velha')).toBeNull()
    expect(add({ name: 'nave-azul', dataUrl: SVG, width: 8, height: 8 })).toBeNull()
    expect(paths(store).at(-1)).toBe(`${base}images/nave_azul_2.svg`)
    const before = store.getState().project
    expect(add({ name: 'grito', dataUrl: MP3, kind: 'audio', pgzeroAudio: 'sound' })).toContain(
      'WAV ou OGG',
    )
    expect(add({ name: 'fundo', dataUrl: WAV, kind: 'audio', pgzeroAudio: 'music' })).toContain(
      'MP3 ou OGG',
    )
    expect(add({ name: 'voz', dataUrl: M4A, kind: 'audio' })).toBeTruthy()
    expect(store.getState().project).toBe(before)
  })

  test(`${kind} Turtle and Python without an extension keep the assets/ path`, async () => {
    for (const extension of [TURTLE_EXTENSION, undefined]) {
      const store = await pythonStore(kind, extension)
      expect(
        store.getState().addAsset({ name: 'nave-azul', dataUrl: PNG, width: 1, height: 1 }),
      ).toBeNull()
      expect(
        store
          .getState()
          .addAsset({ name: 'tema', dataUrl: MP3, kind: 'audio', pgzeroAudio: 'music' }),
      ).toBeNull()
      expect(paths(store)).toEqual(['assets/nave-azul.png', 'assets/tema.mp3'])
    }
  })
}
