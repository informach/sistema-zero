import { expect, test } from 'bun:test'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { buildPythonSourceFiles } from '../pythonSource'

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='

function project(extension: { id: string; version: string }) {
  const raw = documentFixture('python', 'pro')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'pro') throw new Error('fixture')
  raw.tree['src/main.py'] = {
    kind: 'file',
    content: "from pyray import *\nnave = load_texture('images/nave.png')\n",
  }
  raw.installedExtensions = [{ ...extension, installedAt: raw.createdAt }]
  raw.assets = [
    {
      id: 'nave',
      name: 'nave',
      kind: 'image',
      source: 'upload',
      proPath: 'images/nave.png',
      dataUrl: PIXEL,
    },
  ] as typeof raw.assets
  return raw
}

const text = (bytes: unknown) =>
  typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes as Uint8Array)

for (const extension of [RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION]) {
  test(`${extension.id}: the export takes the desktop raylib and never the browser engine`, async () => {
    const { files } = await buildPythonSourceFiles(project(extension))
    expect(text(files['requisitos-raylib.txt'])).toBe('raylib==6.0.1.0\n')
    // The game runs from the root (python src/main.py), so its folders are there.
    expect(files['images/nave.png']).toBeDefined()
    const readme = text(files['LEIA-ME-Sistema-Zero.txt'])
    expect(readme).toContain('python -m pip install -r requisitos-raylib.txt')
    expect(readme).toContain('Para jogar: python src/main.py')
    const manifest = JSON.parse(text(files['.sistemazero/export-manifest.json']))
    expect(manifest.raylib).toEqual({
      package: 'raylib',
      version: '6.0.1.0',
      requirementsPath: 'requisitos-raylib.txt',
    })
    expect(manifest.generatedFiles).toContain('requisitos-raylib.txt')
    // The Studio's own pyray/raylib modules and renderer stay in the browser.
    const paths = Object.keys(files)
    expect(paths.some((path) => /(^|\/)(pyray|raylib|_szraylib)\//.test(path))).toBe(false)
    expect(paths.some((path) => /renderer|\.mjs$/.test(path))).toBe(false)
  })
}

test('a requirements file the child already has is kept; ours takes the next free name', async () => {
  const raw = project(RAYLIB_2D_EXTENSION)
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'pro') throw new Error('fixture')
  raw.tree['requisitos-raylib.txt'] = { kind: 'file', content: 'meu\n' }
  const { files } = await buildPythonSourceFiles(raw)
  expect(text(files['requisitos-raylib.txt'])).toBe('meu\n')
  expect(text(files['requisitos-raylib-2.txt'])).toBe('raylib==6.0.1.0\n')
})

test('a project without Raylib gets no raylib requirement', async () => {
  const { files } = await buildPythonSourceFiles(project(TURTLE_EXTENSION))
  expect(files['requisitos-raylib.txt']).toBeUndefined()
})
