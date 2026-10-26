import { expect, test } from 'bun:test'
import { PYGAME_EXTENSION, PYGAME_FONTS } from '../../runtime/python/pygame/contract'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { buildPygameDesktopFiles } from '../pygameDesktop'
import { buildPythonSourceFiles } from '../pythonSource'

const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='
const wav = 'data:audio/wav;base64,UklGRgQAAABXQVZF'
const text = (bytes: unknown) =>
  typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes as Uint8Array)

test('Pygame-ce export preserves the game, Pinta PNG and WAV, with a native dependency', async () => {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Python Pro fixture required')
  project.installedExtensions = [{ ...PYGAME_EXTENSION, installedAt: project.createdAt }]
  project.tree['src/main.py'] = {
    kind: 'file',
    content: 'import pygame\npygame.image.load("assets/heroi.png")\n',
  }
  project.assets = [
    {
      id: 'heroi',
      name: 'heroi',
      kind: 'image',
      source: 'upload',
      proPath: 'assets/heroi.png',
      dataUrl: png,
    },
    {
      id: 'efeito',
      name: 'efeito',
      kind: 'audio',
      source: 'upload',
      proPath: 'assets/efeito.wav',
      dataUrl: wav,
    },
  ]
  const { files } = await buildPythonSourceFiles(project, null)
  expect(text(files['src/main.py'])).toBe(project.tree['src/main.py'].content)
  expect(files['assets/heroi.png']).toEqual(Buffer.from(png.split(',')[1]!, 'base64'))
  expect(files['assets/efeito.wav']).toEqual(Buffer.from(wav.split(',')[1]!, 'base64'))
  expect(text(files['requisitos-pygame-ce.txt'])).toBe('pygame-ce==2.5.7\n')
  expect(text(files['LEIA-ME-Sistema-Zero.txt'])).toContain('requisitos-pygame-ce.txt')
  expect(text(files['LEIA-ME-Sistema-Zero.txt'])).not.toContain('Tkinter')
  const manifest = JSON.parse(text(files['.sistemazero/export-manifest.json']))
  expect(manifest.pygameCe).toEqual({
    version: '2.5.7',
    requirementsPath: 'requisitos-pygame-ce.txt',
  })
  expect(manifest.generatedFiles).toContain('requisitos-pygame-ce.txt')
  // The learner module and the platform fonts go along: pinta.fonte() opens fontes/<id>.ttf.
  expect(text(files['src/pinta.py'])).toContain('def carregar_sprite(nome)')
  for (const font of PYGAME_FONTS) {
    const bytes = files[`src/fontes/${font}.ttf`] as Uint8Array
    expect(bytes.byteLength).toBeGreaterThan(50_000)
    expect([...bytes.subarray(0, 4)]).toEqual([0, 1, 0, 0])
    expect(manifest.generatedFiles).toContain(`src/fontes/${font}.ttf`)
  }
  expect(manifest.generatedFiles).toContain('src/pinta.py')
})

test('a learner module named pinta.py is kept instead of the platform one', async () => {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Python Pro fixture required')
  project.installedExtensions = [{ ...PYGAME_EXTENSION, installedAt: project.createdAt }]
  project.tree['src/pinta.py'] = { kind: 'file', content: 'MEU = True\n' }
  project.assets = []
  const { files } = await buildPythonSourceFiles(project, null)
  expect(text(files['src/pinta.py'])).toBe('MEU = True\n')
  expect(files['src/fontes/bungee.ttf']).toBeInstanceOf(Uint8Array)
})

test('a learner fontes/ folder still receives each platform font it does not have', () => {
  const { files, generated } = buildPygameDesktopFiles({
    occupied: ['main.py', 'fontes/minha.ttf', 'fontes/bungee.ttf'],
    directories: ['fontes'],
  })
  // The learner's own bungee.ttf wins; the other platform fonts go along.
  expect(files['fontes/bungee.ttf']).toBeUndefined()
  for (const font of PYGAME_FONTS.filter((name) => name !== 'bungee'))
    expect(files[`fontes/${font}.ttf`]).toBeInstanceOf(Uint8Array)
  expect(generated).toContain('pinta.py')
  expect(generated).not.toContain('fontes/bungee.ttf')
})

test('platform files never collide with a learner file or a name in other letter case', () => {
  const asFile = buildPygameDesktopFiles({ occupied: ['fontes', 'Pinta.py'], directories: [] })
  expect(asFile.generated).toEqual([])
  const otherCase = buildPygameDesktopFiles({ occupied: [], directories: ['Fontes'] })
  expect(otherCase.generated).toEqual(['pinta.py'])
})

test('Pygame-ce exports the Pinta module and fonts beside a nested entrypoint', async () => {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('Fixture')
  project.installedExtensions = [{ ...PYGAME_EXTENSION, installedAt: project.createdAt }]
  project.python.entrypoint = 'src/main.py'
  project.assets = []
  project.tree['src/main.py'] = { kind: 'file', content: 'import pygame\nimport pinta\n' }
  const { files } = await buildPythonSourceFiles(project, null)
  expect(text(files['src/pinta.py'])).toContain('def carregar_sprite(nome)')
  expect(files['src/fontes/bungee.ttf']).toBeInstanceOf(Uint8Array)
  expect(files['pinta.py']).toBeUndefined()
  project.tree['src/pinta.py'] = { kind: 'file', content: 'MEU = True\n' }
  const own = await buildPythonSourceFiles(project, null)
  expect(text(own.files['src/pinta.py'])).toBe('MEU = True\n')
})
