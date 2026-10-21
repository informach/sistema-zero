import { expect, test } from 'bun:test'
import { buildPythonProvidedModuleMetadata } from '@sistemazero/core/studio/python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { unzipSync } from 'fflate'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { registerProjectOperation } from '../../state/projectOperations'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { createStudioStores } from '../../state/studioStores'
import { prepareSourceDownload } from '../sourceDownload'
import { buildSourceFiles, exportProjectSource } from '../sourceExport'

async function runtimeContext(
  raw: ReturnType<typeof documentFixture>,
  descriptor: typeof SZ_AUDIO_MODULE_DESCRIPTOR | 'absent' | 'empty' = SZ_AUDIO_MODULE_DESCRIPTOR,
) {
  if (raw.programmingLanguage !== 'python') throw new Error('fixture')
  const worker = { path: 'worker.mjs', sha256: 'b'.repeat(64) }
  const metadata =
    typeof descriptor === 'object' ? await buildPythonProvidedModuleMetadata(descriptor) : null
  const modules = metadata
    ? [
        {
          descriptor: metadata.descriptor,
          descriptorArtifact: {
            path: metadata.descriptorFile.path,
            sha256: metadata.descriptorFile.sha256,
          },
          typingArtifact: { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 },
          browserArtifacts: [worker],
        },
      ]
    : []
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: raw.runtime.profileId,
    releaseId: raw.runtime.releaseId,
    programmingLanguage: 'python',
    kinds: [raw.kind],
    modes: [raw.mode],
    capabilities: ['export-source'],
    extensions: [],
    sourceTargets: ['desktop'],
    requiredBrowserFeatures: [],
    artifacts: [
      worker,
      ...modules.flatMap((module) => [module.descriptorArtifact, module.typingArtifact]),
    ],
    python: {
      version: '3.14.2',
      packages: [],
      ...(descriptor === 'absent' ? {} : { providedModules: modules }),
    },
  })
  raw.runtime.manifestSha256 = release.manifestSha256
  raw.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
  return createStudioRuntimeCatalog({
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: [raw.kind],
        modes: [raw.mode],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
    releases: [release],
  })
}

for (const metadata of ['absent', 'empty'] as const)
  test(`a known release with ${metadata} provided modules does not invent a native audio package`, async () => {
    const raw = documentFixture('python', 'classic')
    raw.assets = []
    const runtimeCatalog = await runtimeContext(raw, metadata)
    const { files, warnings } = await buildSourceFiles(await refinePythonProjectDocument(raw), {
      runtimeCatalog,
    })
    expect(Object.keys(files).some((path) => path.includes('python-audio'))).toBe(false)
    const manifest = JSON.parse(files['.sistemazero/export-manifest.json'] as string)
    expect(manifest.runtimeModules).toEqual({ status: 'known-release', modules: [] })
    expect(manifest.portableAudio).toBeUndefined()
    expect(files['LEIA-ME-Sistema-Zero.txt']).not.toContain('import sz_audio')
    expect(warnings).toEqual([])
  })

test('an unresolved or different runtime preserves a downloadable snapshot without guessing a module version', async () => {
  const raw = documentFixture('python', 'classic')
  raw.assets = []
  const other = structuredClone(raw)
  const otherCatalog = await runtimeContext(other)
  for (const runtimeCatalog of [undefined, null, otherCatalog]) {
    const { files, warnings } = await buildSourceFiles(await refinePythonProjectDocument(raw), {
      runtimeCatalog,
    })
    expect(files['main.py']).toBe(
      raw.programmingLanguage === 'python' && raw.kind === 'classic' ? raw.files['main.py'] : '',
    )
    expect(files['requirements.txt']).toBe('')
    expect(Object.keys(files).some((path) => path.includes('python-audio'))).toBe(false)
    expect(
      JSON.parse(files['.sistemazero/export-manifest.json'] as string).runtimeModules.status,
    ).toBe('unresolved-release')
    expect(warnings.join(' ')).toContain('não foi possível conferir')
  }
})

test('an unavailable historical implementation is never replaced with the current native audio package', async () => {
  const raw = documentFixture('python', 'pro')
  raw.assets = []
  const descriptor = { ...SZ_AUDIO_MODULE_DESCRIPTOR, version: '0.9.0' }
  const runtimeCatalog = await runtimeContext(raw, descriptor)
  const { files, warnings } = await buildSourceFiles(await refinePythonProjectDocument(raw), {
    runtimeCatalog,
  })
  expect(Object.keys(files).some((path) => path.includes('python-audio'))).toBe(false)
  expect(warnings.join(' ')).toContain('sz_audio 0.9.0')
  const manifest = JSON.parse(files['.sistemazero/export-manifest.json'] as string)
  expect(manifest.runtimeModules.modules).toEqual([
    { importName: 'sz_audio', version: '0.9.0', nativePackage: 'unavailable' },
  ])
})

test('native module selection captures the host catalog before lazy loading and rejects tampered metadata', async () => {
  const raw = documentFixture('python', 'pro')
  raw.assets = []
  const original = await runtimeContext(raw)
  const runtimeCatalog = structuredClone(original)
  const project = await refinePythonProjectDocument(raw)
  const pending = buildSourceFiles(project, { runtimeCatalog })
  Reflect.set(
    runtimeCatalog.releases[0]!.manifest.python!.providedModules![0]!.descriptor,
    'version',
    '9.9.9',
  )
  const { files } = await pending
  expect(
    JSON.parse(files['.sistemazero/export-manifest.json'] as string).portableAudio.version,
  ).toBe('1.0.0')
  const invalid = await buildSourceFiles(project, { runtimeCatalog })
  expect(Object.keys(invalid.files).some((path) => path.includes('python-audio'))).toBe(false)
  expect(invalid.warnings.join(' ')).toContain('não foi possível conferir')
})

test('the download preserves runtime metadata while asynchronous writers flush the project', async () => {
  const raw = documentFixture('python', 'pro')
  raw.assets = []
  const runtimeCatalog = structuredClone(await runtimeContext(raw))
  const project = await refinePythonProjectDocument(raw)
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({ project })
  const descriptor = runtimeCatalog.releases[0]!.manifest.python!.providedModules![0]!.descriptor
  const unregister = registerProjectOperation(stores.project, {
    projectId: project.id,
    flush: async () => {
      Reflect.set(descriptor, 'version', '9.9.9')
    },
  })
  try {
    const result = await prepareSourceDownload(
      stores.project,
      stores.pendingEditorEdits,
      new AbortController().signal,
      { runtimeCatalog },
    )
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()))
    const manifest = JSON.parse(
      new TextDecoder().decode(files['.sistemazero/export-manifest.json']),
    )
    expect(descriptor.version).toBe('9.9.9')
    expect(manifest.portableAudio.version).toBe('1.0.0')
    expect(result.warnings).toEqual([])
  } finally {
    unregister()
  }
})

test('unreadable runtime metadata cannot block rescuing authored source or execute a metadata getter', async () => {
  const raw = documentFixture('python', 'classic')
  raw.assets = []
  const runtimeCatalog = structuredClone(await runtimeContext(raw))
  let getterCalls = 0
  Object.defineProperty(runtimeCatalog.releases[0]!.manifest.python!, 'providedModules', {
    get() {
      getterCalls++
      throw new Error('must not run')
    },
    enumerable: true,
  })
  const { files, warnings } = await buildSourceFiles(await refinePythonProjectDocument(raw), {
    runtimeCatalog,
  })
  expect(getterCalls).toBe(0)
  expect(typeof files['main.py']).toBe('string')
  expect(Object.keys(files).some((path) => path.includes('python-audio'))).toBe(false)
  expect(warnings.join(' ')).toContain('não foi possível conferir')
})

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

test('nested source ZIP includes installable audio without rewriting authored modules or dependency files', async () => {
  const raw = documentFixture('python', 'pro')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'pro') throw new Error('fixture')
  raw.assets = []
  raw.tree['src/main.py'] = {
    kind: 'file',
    content: 'import sz_audio\nprint(sz_audio.__version__)\n',
  }
  raw.tree['src/sz_audio.py'] = { kind: 'file', content: 'author = True\n' }
  raw.tree['requirements.txt'] = { kind: 'file', content: 'author-package==1.2.3\n' }
  raw.tree['pyproject.toml'] = { kind: 'file', content: '[project]\nname="author-game"\n' }
  raw.tree['.SISTEMAZERO'] = { kind: 'dir' }
  raw.tree['.SISTEMAZERO/python-audio'] = { kind: 'dir' }
  const runtimeCatalog = await runtimeContext(raw)
  const project = await refinePythonProjectDocument(raw)
  const zip = await exportProjectSource(project, { runtimeCatalog })
  const unzipped = unzipSync(new Uint8Array(await zip.blob.arrayBuffer()))
  const text = (path: string) => new TextDecoder().decode(unzipped[path])
  const manifest = JSON.parse(text('.sistemazero-2/export-manifest.json'))
  const audio = manifest.portableAudio
  expect(manifest.entrypoint).toBe('src/main.py')
  expect(text('src/main.py')).toBe(raw.tree['src/main.py'].content)
  expect(text('src/sz_audio.py')).toBe('author = True\n')
  expect(text('requirements.txt')).toBe('author-package==1.2.3\n')
  expect(text('pyproject.toml')).toBe('[project]\nname="author-game"\n')
  expect(audio.requirementsPath).toBe('.sistemazero-2/python-audio/install.txt')
  expect(text(audio.requirementsPath)).toBe('./.sistemazero-2/python-audio\n')
  expect(audio.files).toHaveLength(10)
  expect(text('.sistemazero-2/python-audio/sz_audio/__init__.pyi')).toContain('def stop(')
  expect(text('.sistemazero-2/python-audio/sz_audio/py.typed')).toBe('')
  expect(text(audio.referencePath)).toContain('turtle.done() ou turtle.mainloop()')
  for (const entry of audio.files) {
    const bytes = unzipped[entry.path]!
    expect(bytes.byteLength).toBe(entry.bytes)
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    expect(entry.sha256).toBe(
      Array.from(hash, (value) => value.toString(16).padStart(2, '0')).join(''),
    )
  }
  expect(text('LEIA-ME-Sistema-Zero.txt')).toContain(
    `python -m pip install -r ${audio.requirementsPath}`,
  )
  expect(text('LEIA-ME-Sistema-Zero.txt')).toContain('subpasta')
})

test('PNG materials record the Tk 8.6 requirement; a project without PNG does not', async () => {
  const withPng = documentFixture('python', 'classic')
  withPng.assets = [
    {
      id: 'heroi',
      name: 'heroi',
      kind: 'image',
      source: 'upload',
      dataUrl: 'data:image/png;base64,aGVybw==',
      proPath: 'assets/heroi.png',
    },
  ] as never
  delete (withPng as { coverAssetName?: string }).coverAssetName
  const runtimeCatalog = await runtimeContext(withPng)
  const exported = await buildSourceFiles(await refinePythonProjectDocument(withPng), {
    runtimeCatalog,
  })
  const limit = expect.stringContaining('Tk 8.6 ou mais recente')
  const manifest = JSON.parse(exported.files['.sistemazero/export-manifest.json'] as string)
  expect(manifest.knownLimits).toContainEqual(limit)
  expect(exported.files['LEIA-ME-Sistema-Zero.txt']).toContain('Tk 8.6 ou mais recente')
  expect(exported.files['LEIA-ME-Sistema-Zero.txt']).toContain('tkinter.TkVersion')

  const withoutPng = documentFixture('python', 'classic')
  withoutPng.assets = []
  delete (withoutPng as { coverAssetName?: string }).coverAssetName
  const plain = await buildSourceFiles(await refinePythonProjectDocument(withoutPng), {
    runtimeCatalog: await runtimeContext(withoutPng),
  })
  const plainManifest = JSON.parse(plain.files['.sistemazero/export-manifest.json'] as string)
  expect(plainManifest.knownLimits).not.toContainEqual(limit)
  expect(plain.files['LEIA-ME-Sistema-Zero.txt']).not.toContain('Tk 8.6')
})
