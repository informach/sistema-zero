import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { PGZERO_EXTENSION } from '../runtime/python/pgzero/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../runtime/python/raylib/contract'
import { documentFixture } from '../state/fixtures/projectDocuments'
import { createProjectStore } from '../state/projectStore'
import { refinePythonProjectDocument } from '../state/pythonProjectValidation'
import {
  projectUsesRaylib,
  projectUsesRaylib3D,
  raylibCodePath,
  raylibMediaFolder,
  raylibMediaPath,
} from './raylibMediaPaths'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
const SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>')}`
const WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZF'
const MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAA'
const M4A = 'data:audio/mp4;base64,AAAAGGZ0eXA='
const TTF = `data:font/ttf;base64,${readFileSync(
  new URL('../../scripts/raylib/scenes/assets/fonts/pressstart2p.ttf', import.meta.url),
).toString('base64')}`
const GLB = `data:model/gltf-binary;base64,${Buffer.from([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 12, 0, 0, 0]).toString('base64')}`

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

test('both Raylib extensions count as Raylib; only the 3D one opens models', () => {
  expect(projectUsesRaylib({ installedExtensions: [RAYLIB_2D_EXTENSION] })).toBe(true)
  expect(projectUsesRaylib({ installedExtensions: [RAYLIB_3D_EXTENSION] })).toBe(true)
  expect(projectUsesRaylib({ installedExtensions: [PGZERO_EXTENSION] })).toBe(false)
  expect(projectUsesRaylib3D({ installedExtensions: [RAYLIB_2D_EXTENSION] })).toBe(false)
  expect(projectUsesRaylib3D({ installedExtensions: [RAYLIB_3D_EXTENSION] })).toBe(true)
})

test('folders follow what the desktop raylib 6.0.1.0 opens (measured)', () => {
  for (const ext of ['png', 'jpg', 'jpeg', 'bmp', 'gif'])
    expect(raylibMediaFolder('image', ext)).toEqual({ folder: 'images' })
  for (const ext of ['svg', 'webp', 'avif'])
    expect(raylibMediaFolder('image', ext)).toHaveProperty('error')
  for (const ext of ['wav', 'ogg', 'mp3', 'flac']) {
    expect(raylibMediaFolder('audio', ext)).toEqual({ folder: 'sounds' })
    expect(raylibMediaFolder('audio', ext, { role: 'music' })).toEqual({ folder: 'music' })
  }
  expect(raylibMediaFolder('audio', 'm4a')).toHaveProperty('error')
  expect(raylibMediaFolder('font', 'ttf')).toEqual({ folder: 'fonts' })
  expect(raylibMediaFolder('font', 'otf')).toEqual({ folder: 'fonts' })
  expect(raylibMediaFolder('model3d', 'glb')).toHaveProperty('error')
  expect(raylibMediaFolder('model3d', 'glb', { with3D: true })).toEqual({ folder: 'models' })
  // The Molda sky (.hdr) does not open on the desktop raylib.
  expect(raylibMediaFolder('environment3d', 'hdr', { with3D: true })).toHaveProperty('error')
})

test('the path keeps the extension; only the exact file name is taken', () => {
  const occupied = { files: ['main.py', 'images/nave.png'], directories: [] }
  const place = (name: string, extension: string, entrypoint = 'main.py') =>
    raylibMediaPath({ entrypoint, name, kind: 'image', extension, occupied })
  expect(place('nave', 'png')).toEqual({ path: 'images/nave-2.png' })
  expect(place('nave', 'gif')).toEqual({ path: 'images/nave.gif' })
  expect(place('nave', 'png', 'src/main.py')).toEqual({ path: 'src/images/nave.png' })
  expect(raylibCodePath({ proPath: 'src/images/nave.png' }, 'src/main.py')).toBe('images/nave.png')
  expect(raylibCodePath({ proPath: 'assets/nave.png' }, 'main.py')).toBeUndefined()
})

describe.each(['classic', 'pro'] as const)('%s project', (kind) => {
  const base = kind === 'pro' ? 'src/' : ''

  test('Raylib: uploads land in images/, sounds/, music/ and fonts/', async () => {
    const store = await pythonStore(kind, RAYLIB_2D_EXTENSION)
    const state = () => store.getState()
    expect(state().addAsset({ name: 'nave', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
    expect(state().addAsset({ name: 'pulo', dataUrl: WAV, kind: 'audio' })).toBeNull()
    expect(
      state().addAsset({ name: 'tema', dataUrl: MP3, kind: 'audio', pgzeroAudio: 'music' }),
    ).toBeNull()
    expect(
      state().addAsset({ name: 'letra', dataUrl: TTF, kind: 'font', originalFileName: 'p.ttf' }),
    ).toBeNull()
    expect(paths(store)).toEqual([
      `${base}images/nave.png`,
      `${base}sounds/pulo.wav`,
      `${base}music/tema.mp3`,
      `${base}fonts/letra.ttf`,
    ])
  })

  test('Raylib refuses what the desktop raylib cannot open', async () => {
    const store = await pythonStore(kind, RAYLIB_2D_EXTENSION)
    const state = () => store.getState()
    expect(state().addAsset({ name: 'vetor', dataUrl: SVG, width: 8, height: 8 })).toContain('PNG')
    expect(state().addAsset({ name: 'voz', dataUrl: M4A, kind: 'audio' })).toContain('WAV')
    expect(
      state().addAsset({ name: 'nave', dataUrl: GLB, kind: 'model3d', originalFileName: 'n.glb' }),
    ).toContain('Raylib 3D')
    expect(paths(store)).toEqual([])
  })

  test('Raylib 3D takes GLB models into models/', async () => {
    const store = await pythonStore(kind, RAYLIB_3D_EXTENSION)
    expect(
      store
        .getState()
        .addAsset({ name: 'nave', dataUrl: GLB, kind: 'model3d', originalFileName: 'n.glb' }),
    ).toBeNull()
    expect(paths(store)).toEqual([`${base}models/nave.glb`])
  })

  test('fonts only enter Raylib projects', async () => {
    for (const extension of [undefined, PGZERO_EXTENSION]) {
      const store = await pythonStore(kind, extension)
      expect(
        store
          .getState()
          .addAsset({ name: 'letra', dataUrl: TTF, kind: 'font', originalFileName: 'p.ttf' }),
      ).toContain('Raylib')
    }
  })

  test('renaming a Raylib material renames its file', async () => {
    const store = await pythonStore(kind, RAYLIB_2D_EXTENSION)
    const state = () => store.getState()
    expect(state().addAsset({ name: 'nave', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
    const id = state().project!.assets![0]!.id
    expect(state().renameAsset(id, 'foguete')).toBeNull()
    expect(paths(store)).toEqual([`${base}images/foguete.png`])
    expect(state().project!.assets![0]!.name).toBe('foguete')
  })

  test('installing Raylib moves the materials into its folders', async () => {
    const store = await pythonStore(kind)
    const state = () => store.getState()
    expect(state().addAsset({ name: 'nave', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
    expect(state().addAsset({ name: 'pulo', dataUrl: WAV, kind: 'audio' })).toBeNull()
    expect(paths(store)).toEqual(['assets/nave.png', 'assets/pulo.wav'])
    const result = await state().applyPythonExtensions(state().project as never, [
      { ...RAYLIB_2D_EXTENSION, installedAt: 2 },
    ])
    expect(result).toBeNull()
    expect(paths(store)).toEqual([`${base}images/nave.png`, `${base}sounds/pulo.wav`])
  })

  test('installing Raylib names the materials it cannot open and changes nothing', async () => {
    const store = await pythonStore(kind)
    const state = () => store.getState()
    expect(state().addAsset({ name: 'voz', dataUrl: M4A, kind: 'audio' })).toBeNull()
    expect(state().addAsset({ name: 'nave', dataUrl: PNG, width: 1, height: 1 })).toBeNull()
    const before = state().project
    const result = await state().applyPythonExtensions(state().project as never, [
      { ...RAYLIB_2D_EXTENSION, installedAt: 2 },
    ])
    expect(result).toContain('voz (M4A)')
    expect(result).not.toContain('nave')
    expect(state().project).toBe(before)
  })
})
