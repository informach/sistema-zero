import { expect, test } from 'bun:test'
import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { buildPythonSourceFiles } from '../pythonSource'

const STAR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30"/></svg>'
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='

function project(extension: { id: string; version: string }, extra: object[] = []) {
  const raw = documentFixture('python', 'pro')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'pro') throw new Error('fixture')
  raw.tree['src/main.py'] = { kind: 'file', content: "estrela = Actor('estrela')\n" }
  raw.installedExtensions = [{ ...extension, installedAt: raw.createdAt }]
  raw.assets = [
    {
      id: 'estrela',
      name: 'estrela',
      kind: 'image',
      source: 'upload',
      proPath: 'src/images/estrela.svg',
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STAR)}`,
    },
    {
      id: 'chao',
      name: 'chao',
      kind: 'image',
      source: 'upload',
      proPath: 'src/images/chao.png',
      dataUrl: PIXEL,
    },
    ...extra,
  ] as typeof raw.assets
  return raw
}

const text = (bytes: unknown) =>
  typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes as Uint8Array)

test('Pygame Zero: each SVG in images/ gets a PNG of its own size; pixel art is untouched', async () => {
  const calls: [number, number][] = []
  const { files } = await buildPythonSourceFiles(project(PGZERO_EXTENSION), null, {
    rasterizeSvg: async (_svg, width, height) => {
      calls.push([width, height])
      return new Uint8Array([1, 2, 3])
    },
  })
  expect(calls).toEqual([[40, 30]])
  expect(files['src/images/estrela.png']).toEqual(new Uint8Array([1, 2, 3]))
  expect(text(files['src/images/estrela.svg'])).toBe(STAR)
  expect(files['src/images/chao.png']).toBeDefined()
  expect(text(files['requisitos-pygame-zero.txt'])).toBe('pygame-ce==2.5.8\nnumpy\n')
  const readme = text(files['LEIA-ME-Sistema-Zero.txt'])
  expect(readme).toContain('python -m pip install -r requisitos-pygame-zero.txt')
  expect(readme).toContain('python -m pip install --no-deps pgzero==1.2.1')
  expect(readme).toContain('Para jogar: python src/main.py')
  expect(readme).toContain('python -X utf8 -m pgzero src/main.py')
  expect(readme).toContain('src/images/estrela.png')
  const manifest = JSON.parse(text(files['.sistemazero/export-manifest.json']))
  expect(manifest.pygameZero).toEqual({
    pgzero: '1.2.1',
    pygameCe: '2.5.8',
    requirementsPath: 'requisitos-pygame-zero.txt',
    pngFromSvg: ['src/images/estrela.png'],
  })
  expect(manifest.generatedFiles).toContain('src/images/estrela.png')
})

test('an existing PNG of the same name is never replaced, and the learner is told', async () => {
  const raw = project(PGZERO_EXTENSION, [
    {
      id: 'estrela-png',
      name: 'estrela-png',
      kind: 'image',
      source: 'upload',
      proPath: 'src/images/estrela.png',
      dataUrl: PIXEL,
    },
  ])
  const { files, warnings } = await buildPythonSourceFiles(raw, null, {
    rasterizeSvg: async () => {
      throw new Error('must not run')
    },
  })
  expect(files['src/images/estrela.png']).not.toEqual(new Uint8Array([1, 2, 3]))
  expect(warnings.some((warning) => warning.includes('src/images/estrela.png já existe'))).toBe(
    true,
  )
})

test('a failed conversion keeps the export and warns; Turtle projects get no Pygame Zero files', async () => {
  const failed = await buildPythonSourceFiles(project(PGZERO_EXTENSION), null, {
    rasterizeSvg: async () => {
      throw new Error('no canvas')
    },
  })
  expect(failed.files['src/images/estrela.png']).toBeUndefined()
  expect(failed.warnings.some((warning) => warning.includes('não abre SVG'))).toBe(true)
  const turtle = await buildPythonSourceFiles(project(TURTLE_EXTENSION), null, {
    rasterizeSvg: async () => {
      throw new Error('must not run')
    },
  })
  expect(turtle.files['requisitos-pygame-zero.txt']).toBeUndefined()
  expect(turtle.files['src/images/estrela.png']).toBeUndefined()
  expect(text(turtle.files['LEIA-ME-Sistema-Zero.txt'])).not.toContain('pgzero')
})
