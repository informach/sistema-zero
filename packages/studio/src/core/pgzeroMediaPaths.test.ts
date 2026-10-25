import { expect, test } from 'bun:test'
import { PGZERO_EXTENSION } from '../runtime/python/pgzero/contract'
import { TURTLE_EXTENSION } from '../runtime/python/turtle/contract'
import { documentFixture } from '../state/fixtures/projectDocuments'
import { createProjectStore } from '../state/projectStore'
import { refinePythonProjectDocument } from '../state/pythonProjectValidation'
import { isSvgDataUrl, projectAssetFileExtension, pythonAssetFileExtension } from './assetBinary'
import {
  PGZERO_EXTENSION_ID,
  pgzeroCodeName,
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
  // The font of a game (screen.draw.text(..., fontname=...)) lives in fonts/.
  expect(pgzeroMediaFolder('font', 'ttf')).toEqual({ folder: 'fonts' })
  expect(pgzeroMediaFolder('font', 'woff2')).toHaveProperty('error')
  expect(pgzeroMediaFolder('model3d', 'glb')).toHaveProperty('error')
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
    // The file follows a rename (Pygame Zero opens it by name), freeing the old name.
    const first = store.getState().project!.assets![0]!
    expect(store.getState().renameAsset(first.id, 'nave-velha')).toBeNull()
    expect(paths(store)[0]).toBe(`${base}images/nave_velha.png`)
    expect(add({ name: 'nave-azul', dataUrl: SVG, width: 8, height: 8 })).toBeNull()
    expect(paths(store).at(-1)).toBe(`${base}images/nave_azul.svg`)
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

const svgOf = (attributes: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${attributes}/>`)}`

for (const kind of ['classic', 'pro'] as const) {
  const base = kind === 'pro' ? 'src/' : ''

  test(`${kind} Pygame Zero: the panel name reads like the code name, and a rename moves the file`, async () => {
    // An example's sound: named `sounds-acerto`, the file is sounds/acerto.wav.
    const store = createProjectStore()
    const raw = documentFixture('python', kind)
    raw.installedExtensions = [{ ...PGZERO_EXTENSION, installedAt: 1 }]
    raw.assets = [
      {
        id: 'exemplo',
        name: 'sounds-acerto',
        kind: 'audio',
        source: 'upload',
        proPath: `${base}sounds/acerto.wav`,
        dataUrl: WAV,
      },
    ]
    store.getState().hydrateProject(await refinePythonProjectDocument(raw))
    const state = () => store.getState()
    const entrypoint = (state().project as { python: { entrypoint: string } }).python.entrypoint
    const last = () => state().project!.assets!.at(-1)!
    // The child's own acerto.wav cannot be sounds.acerto (taken): its name says acerto-2.
    expect(state().addAsset({ name: 'acerto', dataUrl: WAV, kind: 'audio' })).toBeNull()
    expect(last()).toMatchObject({ name: 'acerto-2', proPath: `${base}sounds/acerto_2.wav` })
    expect(pgzeroCodeName(last(), entrypoint)).toBe('acerto_2')
    expect(pgzeroCodeName(state().project!.assets![0]!, entrypoint)).toBe('acerto')
    // "nave azul.png": the panel shows nave-azul, the code says nave_azul.
    expect(state().addAsset({ name: 'nave-azul', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
    const image = last()
    expect(pgzeroCodeName(image, entrypoint)).toBe('nave_azul')
    // A rename moves the file, so `Actor('heroi')` finds it; the chosen cover follows.
    expect(state().setCoverAsset(image.id)).toBeNull()
    expect(state().renameAsset(image.id, 'heroi')).toBeNull()
    expect(last()).toMatchObject({ name: 'heroi', proPath: `${base}images/heroi.png` })
    expect(state().project!.coverAssetName).toBe('heroi')
    // Renaming the example's sound frees acerto.wav for nobody else: its own path is never a
    // collision with itself.
    expect(state().renameAsset('exemplo', 'acerto')).toBeNull()
    expect(state().project!.assets![0]).toMatchObject({
      name: 'acerto',
      proPath: `${base}sounds/acerto.wav`,
    })
  })

  test(`${kind} installing Pygame Zero moves the materials to the folders it searches`, async () => {
    for (const extension of [TURTLE_EXTENSION, undefined]) {
      const store = await pythonStore(kind, extension)
      const state = () => store.getState()
      expect(state().addAsset({ name: 'nave', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
      expect(state().addAsset({ name: 'pulo', dataUrl: WAV, kind: 'audio' })).toBeNull()
      expect(state().addAsset({ name: 'tema', dataUrl: MP3, kind: 'audio' })).toBeNull()
      expect(state().setCoverAsset(state().project!.assets![0]!.id)).toBeNull()
      expect(paths(store)).toEqual(['assets/nave.png', 'assets/pulo.wav', 'assets/tema.mp3'])
      const result = await state().applyPythonExtensions(state().project as never, [
        { ...PGZERO_EXTENSION, installedAt: 2 },
      ])
      expect(result).toBeNull()
      expect(paths(store)).toEqual([
        `${base}images/nave.png`,
        `${base}sounds/pulo.wav`,
        `${base}music/tema.mp3`,
      ])
      expect(state().project!.coverAssetName).toBe('nave')
    }
  })

  test(`${kind} installing Pygame Zero names the materials it cannot open`, async () => {
    const store = await pythonStore(kind)
    const state = () => store.getState()
    const WEBP = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
    expect(state().addAsset({ name: 'foto', dataUrl: WEBP, width: 1, height: 1 })).toBeNull()
    expect(state().addAsset({ name: 'voz', dataUrl: M4A, kind: 'audio' })).toBeNull()
    expect(state().addAsset({ name: 'nave', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
    const before = state().project
    const result = await state().applyPythonExtensions(state().project as never, [
      { ...PGZERO_EXTENSION, installedAt: 2 },
    ])
    expect(result).toContain('foto (WEBP), voz (M4A)')
    expect(result).not.toContain('nave')
    expect(state().project).toBe(before)
  })

  test(`${kind} installing Pygame Zero applies the SVG size rule to the SVGs already there`, async () => {
    const store = await pythonStore(kind)
    const state = () => store.getState()
    expect(
      state().addAsset({ name: 'cheio', dataUrl: svgOf('width="100%"'), width: 300, height: 150 }),
    ).toBeNull()
    expect(
      state().addAsset({
        name: 'caixa',
        dataUrl: svgOf('viewBox="0 0 40 20"'),
        width: 300,
        height: 150,
      }),
    ).toBeNull()
    const before = state().project
    const refused = await state().applyPythonExtensions(state().project as never, [
      { ...PGZERO_EXTENSION, installedAt: 2 },
    ])
    expect(refused).toContain('cheio (SVG sem tamanho)')
    expect(refused).not.toContain('caixa')
    expect(state().project).toBe(before)
    state().removeAsset(state().project!.assets!.find((asset) => asset.name === 'cheio')!.id)
    expect(
      await state().applyPythonExtensions(state().project as never, [
        { ...PGZERO_EXTENSION, installedAt: 2 },
      ]),
    ).toBeNull()
    const caixa = state().project!.assets!.find((asset) => asset.name === 'caixa')!
    // The size Pygame Zero reads, not the browser's 300x150.
    const base = kind === 'pro' ? 'src/' : ''
    expect([caixa.width, caixa.height, caixa.proPath]).toEqual([40, 20, `${base}images/caixa.svg`])
  })

  test(`${kind} Pygame Zero refuses an SVG it cannot size and keeps the size it reads`, async () => {
    const store = await pythonStore(kind, PGZERO_EXTENSION)
    const state = () => store.getState()
    // The browser reports 300x150 for an SVG without a size of its own.
    const add = (name: string, dataUrl: string) =>
      state().addAsset({ name, dataUrl, width: 300, height: 150 })
    expect(add('cheio', svgOf('width="100%" height="100%"'))).toContain('tamanho')
    expect(add('letras', svgOf('width="10em" height="4em"'))).toContain('tamanho')
    expect(add('enorme', svgOf('width="5000" height="10"'))).toContain('4096')
    expect(state().project!.assets).toEqual([])
    expect(add('caixa', svgOf('viewBox="0 0 40 20"'))).toBeNull()
    const box = state().project!.assets![0]!
    expect(box).toMatchObject({ width: 40, height: 20 })
    expect(state().updateAssetImage(box.id, { dataUrl: svgOf('width="auto"') })).toContain(
      'tamanho',
    )
  })
}

test('a material named like a loader member gets _2 (`images.load` is the loader method)', () => {
  for (const name of ['load', 'cache', 'cache_key', 'subpath', 'have_root', 'validate_root'])
    expect(
      pgzeroMediaPath({
        entrypoint: 'main.py',
        name,
        kind: 'audio',
        extension: 'wav',
        occupied: { files: ['main.py'], directories: [] },
      }),
    ).toEqual({ path: `sounds/${name}_2.wav` })
})

test('every WAV MIME a browser reports maps to .wav; an SVG data URL matches exactly', () => {
  for (const mime of ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/vnd.wav'])
    expect(pythonAssetFileExtension(mime, 'audio')).toBe('wav')
  // The JavaScript materializer keeps its historical names: the new aliases are Python-only.
  for (const mime of ['audio/wave', 'audio/vnd.wave', 'audio/vnd.wav'])
    expect(projectAssetFileExtension(mime, 'audio')).toBe('bin')
  expect(isSvgDataUrl('data:image/svg+xml;charset=utf-8,%3Csvg')).toBe(true)
  expect(isSvgDataUrl('data:image/svg+xml;base64,PHN2Zw==')).toBe(true)
  expect(isSvgDataUrl('data:image/svg+xml,%3Csvg')).toBe(true)
  expect(isSvgDataUrl('data:image/svg+xmlX,%3Csvg')).toBe(false)
  expect(isSvgDataUrl('data:image/svg+xml;charset=latin1,%3Csvg')).toBe(false)
})

test('a font in fonts/ has its code name too (fontname=...)', () => {
  expect(pgzeroCodeName({ proPath: 'fonts/pressstart2p.ttf' }, 'main.py')).toBe('pressstart2p')
  expect(pgzeroCodeName({ proPath: 'src/fonts/letra.otf' }, 'src/main.py')).toBe('letra')
  expect(pgzeroCodeName({ proPath: 'assets/letra.ttf' }, 'main.py')).toBeUndefined()
})
