import { expect, test } from 'bun:test'
import { unzipSync } from 'fflate'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { buildSourceFiles, exportProjectSource } from '../sourceExport'

for (const kind of ['classic', 'pro'] as const)
  test(`Python ${kind}: source ZIP preserves the actual program and materials without a browser adapter`, async () => {
    const raw = documentFixture('python', kind)
    raw.assets = [
      {
        id: 'hero',
        name: 'hero',
        kind: 'image',
        proPath: 'images/hero.gif',
        dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      },
    ]
    const project = await refinePythonProjectDocument(raw)
    const { files } = await buildSourceFiles(project)
    expect(files['index.html']).toBeUndefined()
    expect(files['turtle.py']).toBeUndefined()
    expect(files['sz-assets.js']).toBeUndefined()
    expect(files[project.python.entrypoint]).toContain('print(n)')
    expect(files['images/hero.gif']).toEqual(
      Uint8Array.from(atob(project.assets![0]!.dataUrl.split(',')[1]!), (char) =>
        char.charCodeAt(0),
      ),
    )
    expect(files['LEIA-ME-Sistema-Zero.txt']).toContain(`python ${project.python.entrypoint}`)
    const zip = await exportProjectSource(project)
    const unzipped = unzipSync(new Uint8Array(await zip.blob.arrayBuffer()))
    const originalImage = files['images/hero.gif']
    if (!(originalImage instanceof Uint8Array)) throw new Error('image bytes')
    expect(Array.from(unzipped['images/hero.gif']!)).toEqual(Array.from(originalImage))
    expect(new TextDecoder().decode(unzipped[project.python.entrypoint])).toBe(
      files[project.python.entrypoint] as string,
    )
  })

test('source export preserves authored instructions and captures the files before lazy loading', async () => {
  const raw = documentFixture('python', 'classic')
  raw.assets = []
  const project = await refinePythonProjectDocument(raw)
  if (project.kind !== 'classic') throw new Error('fixture')
  project.files['leia-me-sistema-zero.txt'] = 'My original instructions'
  const source = project.files['main.py']
  const pending = buildSourceFiles(project)
  project.files['main.py'] = 'changed after export started'
  const { files } = await pending
  expect(files['main.py']).toBe(source)
  expect(files['leia-me-sistema-zero.txt']).toBe('My original instructions')
  expect(files['LEIA-ME-Sistema-Zero-2.txt']).toContain('Python nativo')
})

test('desktop ZIP identifies its exact source and media snapshot without certifying native execution', async () => {
  const raw = documentFixture('python', 'pro')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'pro') throw new Error('fixture')
  raw.tree.rascunhos = { kind: 'dir' }
  raw.tree['src/main.py'] = { kind: 'file', content: 'print("ação 🐢")\r\n' }
  const license = { name: 'CC-BY-4.0', attribution: 'Ana', sourceUrl: 'https://example.test/ana' }
  raw.assets = [
    {
      id: 'hero',
      name: 'hero',
      kind: 'image',
      proPath: 'images/hero.gif',
      dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      source: 'library',
      libId: 'drawing-1',
      libOrigin: 'pinta',
      libRevision: 7,
      license,
    },
  ]
  const project = await refinePythonProjectDocument(raw)
  const zip = await exportProjectSource(project)
  const unzipped = unzipSync(new Uint8Array(await zip.blob.arrayBuffer()))
  const manifest = JSON.parse(
    new TextDecoder().decode(unzipped['.sistemazero/export-manifest.json']),
  )
  expect(manifest.language).toBe('python')
  expect(manifest.entrypoint).toBe('src/main.py')
  expect(manifest.runtime).toEqual(project.runtime)
  expect(manifest.browserDependencyLock).toEqual(project.python.dependencyLock)
  expect(manifest.desktopExecution).toBe('not-observed')
  expect(manifest.source.directories).toEqual(['rascunhos', 'src'])
  expect(unzipped['rascunhos/']).toEqual(new Uint8Array())
  for (const entry of manifest.source.files) {
    const bytes = unzipped[entry.path]!
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    expect(entry.sha256).toBe(
      Array.from(hash, (value) => value.toString(16).padStart(2, '0')).join(''),
    )
    expect(entry.bytes).toBe(bytes.byteLength)
  }
  expect(new TextDecoder().decode(unzipped['src/main.py'])).toBe('print("ação 🐢")\r\n')
  const material = manifest.assets.assets[0]
  expect(material.path).toBe('images/hero.gif')
  expect(material.libRevision).toBe(7)
  expect(material.license).toEqual(license)
  const materialHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', unzipped[material.path]!),
  )
  expect(material.sha256).toBe(
    Array.from(materialHash, (value) => value.toString(16).padStart(2, '0')).join(''),
  )
  const config = new TextDecoder().decode(unzipped['pyproject.toml'])
  expect(config).toContain('requires-python = ">=3.14.2,<3.15"')
  expect(config).toContain('dependencies = []')
  expect(config).not.toContain('"turtle"')
  expect(manifest.portabilityAnalysis).toBe('not-performed')
})

test('generated desktop metadata cannot overwrite authored directories, files or case variants', async () => {
  const raw = documentFixture('python', 'pro')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'pro') throw new Error('fixture')
  raw.assets = []
  raw.tree['.sistemazero'] = { kind: 'file', content: 'author metadata' }
  raw.tree['LEIA-ME-Sistema-Zero.txt'] = { kind: 'dir' }
  raw.tree['PYPROJECT.TOML'] = { kind: 'file', content: '[project]\nname = "my-game"\n' }
  const { files, warnings } = await buildSourceFiles(await refinePythonProjectDocument(raw))
  expect(files['.sistemazero']).toBe('author metadata')
  expect(files['PYPROJECT.TOML']).toBe('[project]\nname = "my-game"\n')
  expect(files['pyproject.toml']).toBeUndefined()
  expect(files['.sistemazero/export-manifest.json']).toBeUndefined()
  expect(typeof files['.sistemazero-2/export-manifest.json']).toBe('string')
  expect(files['LEIA-ME-Sistema-Zero.txt/']).toEqual(new Uint8Array())
  expect(files['LEIA-ME-Sistema-Zero-2.txt']).toContain('não foi validada')
  expect(warnings.join(' ')).toContain('não foi validada')
})

test('edited requirements remain downloadable without inventing a native dependency resolution', async () => {
  const raw = documentFixture('python', 'classic')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'classic') throw new Error('fixture')
  raw.assets = []
  raw.files['requirements.txt'] = 'future-package==1.2.3\n'
  const { files, warnings } = await buildSourceFiles(await refinePythonProjectDocument(raw))
  expect(files['requirements.txt']).toBe('future-package==1.2.3\n')
  expect(files['pyproject.toml']).toBeUndefined()
  expect(warnings.join(' ')).toContain('dependências nativas')
  const manifest = JSON.parse(files['.sistemazero/export-manifest.json'] as string)
  expect(manifest.desktopExecution).toBe('not-observed')
  expect(manifest.browserDependencyLock.packages).toEqual([])
})

test('case-variant native requirements preserve their name and prevent an invented empty configuration', async () => {
  const raw = documentFixture('python', 'pro')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'pro') throw new Error('fixture')
  raw.assets = []
  delete raw.tree['requirements.txt']
  raw.tree['REQUIREMENTS.TXT'] = { kind: 'file', content: 'future-package==1.2.3\n' }
  const { files, warnings } = await buildSourceFiles(await refinePythonProjectDocument(raw))
  expect(files['REQUIREMENTS.TXT']).toBe('future-package==1.2.3\n')
  expect(files['requirements.txt']).toBeUndefined()
  expect(files['pyproject.toml']).toBeUndefined()
  expect(warnings.join(' ')).toContain('dependências nativas')
  expect(files['LEIA-ME-Sistema-Zero.txt']).toContain('-r REQUIREMENTS.TXT')
})
