import { expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { buildPythonProvidedModuleMetadata } from '@sistemazero/core/studio/python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import type { StudioPythonRuntimeFeature } from '@sistemazero/core/studio/python-runtime-features'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { IDBFactory } from 'fake-indexeddb'
import { unzipSync } from 'fflate'
import { PGZERO_GAMES, type PgzeroGame } from '../examples/python/pgzeroGames.manifest'
import { PYGAME_GAMES } from '../examples/python/pygameGames.manifest'
import { RAYLIB_GAMES } from '../examples/python/raylibGames.manifest'
import { VISUAL_REFERENCE_GAMES } from '../examples/python/visualReferenceGames.manifest'
import type { PythonExampleCreationPort, PythonExampleEntry } from '../examples/pythonCatalog'
import { PYTHON_EXAMPLE_SUMMARIES } from '../examples/pythonCatalog'
import { exportProjectSource } from '../export/sourceExport'
import { PYTHON_PROGRAMMING_CODECS } from '../python/blocks/catalog'
import { PYTHON_PGZERO_CODECS } from '../python/extensions/pgzero/catalog'
import { PYTHON_PYGAME_CODECS } from '../python/extensions/pygame/catalog'
import { PYTHON_RAYLIB_2D_CODECS } from '../python/extensions/raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../python/extensions/raylib3d/catalog'
import { PYTHON_TURTLE_CODECS } from '../python/extensions/turtle/catalog'
import { TURTLE_EXTENSION } from '../runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { listAllProjects, loadProjectById } from '../state/persistence'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../state/projectStorageRuntime'
import { loadSanitizedProjectById } from '../state/projectStore'
import { createPythonExampleProject } from './createPythonExampleProject'

const fixtureEntry = (
  load: PythonExampleEntry['load'] = async () => ({
    entrypoint: 'main.py',
    files: { 'main.py': 'import turtle\nprint("exemplo")', 'src/helper.py': 'value = 7' },
  }),
): PythonExampleEntry => ({
  programmingLanguage: 'python',
  key: 'python:test-only',
  name: 'Fixture privada',
  description: 'Não distribuída',
  emoji: '🐢',
  experience: 'game',
  kind: 'pro',
  extensions: [TURTLE_EXTENSION],
  load,
})

async function fixture(
  run: (port: PythonExampleCreationPort) => Promise<void>,
  kind: 'classic' | 'pro' = 'pro',
) {
  const oldIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const oldScope = captureProjectStorageScope()
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  setProjectStorageNamespace(`python-example-${crypto.randomUUID()}`)
  try {
    const f = await pythonEnvironmentFixture(kind)
    const context = {
      catalog: f.environment.catalog,
      runtime: f.project.runtime,
      releaseStatus: 'active' as const,
      authoringBlockIds: [
        ...PYTHON_PROGRAMMING_CODECS,
        ...PYTHON_TURTLE_CODECS,
        ...PYTHON_PGZERO_CODECS,
        ...PYTHON_RAYLIB_2D_CODECS,
        ...PYTHON_RAYLIB_3D_CODECS,
        ...PYTHON_PYGAME_CODECS,
      ].map(({ id }) => id),
      authoringCuration: {
        pythonLevel: 3 as const,
        allowedModes: ['blocks', 'bridge', 'code'] as ('blocks' | 'bridge' | 'code')[],
      },
    }
    await run({
      environments: [{ key: 'approved', label: 'Python', kind, context }],
      prepare: async () => context,
      authorizeExample: async () => {},
    })
  } finally {
    setProjectStorageNamespace(oldScope.namespace)
    if (oldIdb) Object.defineProperty(globalThis, 'indexedDB', oldIdb)
    else Reflect.deleteProperty(globalThis, 'indexedDB')
  }
}

const options = () => ({ signal: new AbortController().signal, isCurrent: () => true })

test('free examples require earned extension grants at discovery and after fresh preparation', async () =>
  fixture(async (port) => {
    let loads = 0
    const entry = fixtureEntry(async () => {
      loads++
      return { entrypoint: 'main.py', files: { 'main.py': 'import turtle' } }
    })
    const context = port.environments[0]!.context
    context.grantedExtensionIds = []
    await expect(createPythonExampleProject(entry, port, options())).rejects.toThrow()
    expect(loads).toBe(0)
    expect(await listAllProjects()).toEqual([])
    context.grantedExtensionIds = ['python-turtle']
    port.prepare = async () => ({ ...context, grantedExtensionIds: [] })
    await expect(createPythonExampleProject(entry, port, options())).rejects.toThrow()
    expect(loads).toBe(1)
    expect(await listAllProjects()).toEqual([])
  }))

for (const mode of ['blocks', 'bridge'] as const)
  test(`a Classic Python example starts in ${mode} and persists its editable source intact`, async () =>
    fixture(async (port) => {
      const source = 'import turtle\nvelocidade = 3\nturtle.forward(velocidade)\n'
      const entry = {
        ...fixtureEntry(async () => ({
          entrypoint: 'main.py',
          files: { 'main.py': source, 'README.md': 'Um jogo editável nos três modos.' },
          assets: [],
        })),
        kind: 'classic' as const,
        mode,
      }
      const selections: unknown[] = []
      const prepare = port.prepare
      port.prepare = async (selection) => {
        selections.push(selection)
        return prepare(selection)
      }
      const project = await createPythonExampleProject(entry, port, options())
      expect(project.kind).toBe('classic')
      expect(project.mode).toBe(mode)
      if (project.kind !== 'classic') throw new Error('Classic project required')
      expect(project.files['main.py']).toBe(source)
      expect(project).not.toHaveProperty('tree')
      expect(selections).toEqual([{ kind: 'classic', environmentKey: 'approved' }])
      const reopened = await loadSanitizedProjectById(project.id)
      expect(reopened?.programmingLanguage).toBe('python')
      expect(reopened?.kind).toBe('classic')
      expect(reopened?.mode).toBe(mode)
      if (reopened?.programmingLanguage !== 'python' || reopened.kind !== 'classic')
        throw new Error('Saved Classic Python project required')
      expect(reopened.files).toEqual(project.files)
      expect(reopened.installedExtensions).toEqual(project.installedExtensions)
    }, 'classic'))

/** Real catalog validation, inert artifact hashes: this fixture never executes Python. */
async function withAudio(
  port: PythonExampleCreationPort,
  version = '1.0.0',
  features: readonly StudioPythonRuntimeFeature[] = [],
) {
  const initial = port.environments[0]!
  const previous = selectStudioRuntimeRelease(initial.context.catalog, initial.context.runtime)
  if (!previous?.manifest.python) throw new Error('Python fixture required')
  const metadata = await buildPythonProvidedModuleMetadata({
    ...SZ_AUDIO_MODULE_DESCRIPTOR,
    version,
  })
  const worker = { path: 'worker.mjs', sha256: 'b'.repeat(64) }
  const module = {
    descriptor: metadata.descriptor,
    descriptorArtifact: {
      path: metadata.descriptorFile.path,
      sha256: metadata.descriptorFile.sha256,
    },
    typingArtifact: { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 },
    browserArtifacts: [worker],
  }
  const release = await createStudioRuntimeRelease({
    ...previous.manifest,
    releaseId: `provided-${version}`,
    artifacts: [worker, module.descriptorArtifact, module.typingArtifact],
    python: {
      ...previous.manifest.python,
      providedModules: [module],
      features,
    },
  })
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        ...initial.context.catalog.profiles[0]!,
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const context = {
    ...initial.context,
    catalog,
    runtime: {
      profileId: release.profileId,
      releaseId: release.releaseId,
      manifestSha256: release.manifestSha256,
    },
    releaseStatus: 'active' as const,
  }
  return {
    ...port,
    environments: [{ ...initial, context }],
    prepare: async () => context,
  }
}

test('a new Classic example needs fresh host block approval and effective palette, while Pro source does not', async () =>
  fixture(async (port) => {
    let loaded = 0
    const entry = {
      ...fixtureEntry(async () => {
        loaded++
        return { entrypoint: 'main.py', files: { 'main.py': 'x = 1\n' } }
      }),
      kind: 'classic' as const,
      mode: 'blocks' as const,
      requiredBlockIds: ['sz_py_class'],
    }
    const original = port.environments[0]!
    for (const context of [
      { ...original.context, authoringBlockIds: undefined },
      { ...original.context, authoringBlockIds: [] },
      { ...original.context, authoringCuration: { pythonLevel: 1 as const } },
      {
        ...original.context,
        authoringCuration: { pythonLevel: 1 as const, allowLevelReveal: true },
      },
    ])
      await expect(
        createPythonExampleProject(
          entry,
          {
            ...port,
            environments: [{ ...original, context }],
            prepare: async () => context,
          },
          options(),
        ),
      ).rejects.toThrow()
    expect(loaded).toBe(0)
    expect(await listAllProjects()).toEqual([])
    await expect(
      createPythonExampleProject(
        entry,
        {
          ...port,
          prepare: async () => ({ ...original.context, authoringBlockIds: [] }),
        },
        options(),
      ),
    ).rejects.toThrow('compatível')
    expect(loaded).toBe(1)
    expect(await listAllProjects()).toEqual([])
    port.authorizeExample = async (_project, _signal, requirements) => {
      expect(requirements).toEqual({
        requiredBlockIds: ['sz_py_class'],
        requiredModes: ['blocks', 'bridge'],
      })
      throw new Error('A aprovação final foi retirada')
    }
    await expect(createPythonExampleProject(entry, port, options())).rejects.toThrow(
      'aprovação final',
    )
    expect(await listAllProjects()).toEqual([])
    port.authorizeExample = async () => {}
    const fresh = await createPythonExampleProject(entry, port, options())
    expect(fresh.kind).toBe('classic')
  }, 'classic'))

test('Pro examples do not depend on classic block approval or curations', async () =>
  fixture(async (port) => {
    const original = port.environments[0]!
    const context = {
      ...original.context,
      authoringBlockIds: [],
      authoringCuration: { pythonLevel: 1 as const },
    }
    const project = await createPythonExampleProject(
      {
        ...fixtureEntry(),
        requiredBlockIds: ['sz_py_class'],
      },
      { ...port, environments: [{ ...original, context }], prepare: async () => context },
      options(),
    )
    expect(project.kind).toBe('pro')
  }))

test('required engine features are checked before loading and again after fresh preparation', async () =>
  fixture(async (port) => {
    const old = await withAudio(port)
    const capable = await withAudio(port, '1.0.0', ['turtle-compound-shapes'])
    let loads = 0
    const requiredPythonFeatures: StudioPythonRuntimeFeature[] = ['turtle-compound-shapes']
    const entry = {
      ...fixtureEntry(async () => {
        loads++
        requiredPythonFeatures.length = 0
        return { entrypoint: 'main.py', files: { 'main.py': 'import turtle\n' } }
      }),
      requiredPythonFeatures,
    }
    await expect(createPythonExampleProject(entry, old, options())).rejects.toThrow('compatível')
    expect(loads).toBe(0)
    await expect(
      createPythonExampleProject(
        entry,
        {
          ...capable,
          prepare: old.prepare,
        },
        options(),
      ),
    ).rejects.toThrow('compatível')
    expect(loads).toBe(1)
    expect(await listAllProjects()).toEqual([])
  }))

test('a required provided module must exist at its exact version before loading the payload', async () =>
  fixture(async (port) => {
    let loads = 0
    const entry = {
      ...fixtureEntry(async () => {
        loads++
        return { entrypoint: 'main.py', files: { 'main.py': 'print(1)' } }
      }),
      requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
    }
    for (const unavailable of [port, await withAudio(port, '0.9.0')]) {
      const error = await createPythonExampleProject(entry, unavailable, options()).then(
        () => null,
        (reason: unknown) => reason,
      )
      expect(error).toBeInstanceOf(Error)
      expect(await listAllProjects()).toEqual([])
    }
    expect(loads).toBe(0)
  }))

test('fresh prepare losing a required provided module never reaches authorization or storage', async () =>
  fixture(async (port) => {
    const compatible = await withAudio(port)
    let authorizations = 0
    const entry = {
      ...fixtureEntry(),
      requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
    }
    const error = await createPythonExampleProject(
      entry,
      {
        ...compatible,
        prepare: port.prepare,
        authorizeExample: async () => {
          authorizations++
        },
      },
      options(),
    ).then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    expect(authorizations).toBe(0)
    expect(await listAllProjects()).toEqual([])
  }))

test('mutating module requirements while loading cannot remove a captured compatibility requirement', async () =>
  fixture(async (port) => {
    const requirements = [{ importName: 'sz_audio', version: '1.0.0' }]
    const entry = {
      ...fixtureEntry(async () => {
        requirements.splice(0)
        return { entrypoint: 'main.py', files: { 'main.py': 'print(1)' } }
      }),
      requiredProvidedModules: requirements,
    }
    const compatible = await withAudio(port)
    const error = await createPythonExampleProject(
      entry,
      { ...compatible, prepare: port.prepare },
      options(),
    ).then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(requirements).toEqual([])
    expect(error).toBeInstanceOf(Error)
    expect(await listAllProjects()).toEqual([])
  }))

test('changing a requirement version during load cannot authorize a different prepared module version', async () =>
  fixture(async (port) => {
    const compatible = await withAudio(port)
    const older = await withAudio(port, '0.9.0')
    const requirement = { importName: 'sz_audio', version: '1.0.0' }
    const entry = {
      ...fixtureEntry(async () => {
        requirement.version = '0.9.0'
        return { entrypoint: 'main.py', files: { 'main.py': 'print(1)' } }
      }),
      requiredProvidedModules: [requirement],
    }
    const error = await createPythonExampleProject(
      entry,
      { ...compatible, prepare: older.prepare },
      options(),
    ).then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(requirement.version).toBe('0.9.0')
    expect(error).toBeInstanceOf(Error)
    expect(await listAllProjects()).toEqual([])
  }))

test('the prepared context is captured before later awaits and does not follow external runtime mutation', async () =>
  fixture(async (port) => {
    const compatible = await withAudio(port)
    const context = structuredClone(compatible.environments[0]!.context)
    const expectedRuntime = { ...context.runtime }
    const entry = {
      ...fixtureEntry(),
      requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
    }
    compatible.prepare = () =>
      new Promise((resolve) => {
        queueMicrotask(() => {
          resolve(context)
          queueMicrotask(() => {
            context.runtime.manifestSha256 = 'f'.repeat(64)
          })
        })
      })
    const project = await createPythonExampleProject(entry, compatible, options())
    expect(context.runtime.manifestSha256).toBe('f'.repeat(64))
    expect(project.runtime).toEqual(expectedRuntime)
    expect(await listAllProjects()).toHaveLength(1)
  }))

test('module compatibility never substitutes the fresh host authorization', async () =>
  fixture(async (port) => {
    const compatible = await withAudio(port)
    let authorized = 0
    compatible.authorizeExample = async (candidate) => {
      authorized++
      expect(candidate.runtime).toEqual(compatible.environments[0]!.context.runtime)
      expect(await listAllProjects()).toEqual([])
      throw new Error('A permissão de criar foi revogada')
    }
    const error = await createPythonExampleProject(
      {
        ...fixtureEntry(),
        requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
      },
      compatible,
      options(),
    ).then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    expect(error instanceof Error ? error.message : null).toContain('revogada')
    expect(authorized).toBe(1)
    expect(await listAllProjects()).toEqual([])
  }))

const pgzeroKeys = PGZERO_GAMES.flatMap(({ key }) => [`python:${key}:blocks`, `python:${key}:code`])
const raylibKeys = RAYLIB_GAMES.flatMap(({ key }) => [`python:${key}:blocks`, `python:${key}:code`])
const pygameKeys = PYGAME_GAMES.flatMap(({ key }) => [`python:${key}:blocks`, `python:${key}:code`])
const visualKeys = VISUAL_REFERENCE_GAMES.flatMap(({ key }) => [
  `python:${key}:blocks`,
  `python:${key}:code`,
])

test('the Python catalog keeps the original race and adds the separately licensed maze', () => {
  expect(PYTHON_EXAMPLE_SUMMARIES.map(({ key }) => key)).toEqual([
    'python:turtle-race-original',
    'python:maze-lights',
    ...visualKeys,
    ...pgzeroKeys,
    ...raylibKeys,
    ...pygameKeys,
  ])
})

for (const key of visualKeys)
  test(`${key} creates, reopens and exports its entire authored program and native audio dependency`, async () => {
    const entry = PYTHON_EXAMPLE_SUMMARIES.find((candidate) => candidate.key === key)
    if (!entry) throw new Error(`Missing reference game ${key}`)
    await fixture(async (port) => {
      const compatible = await withAudio(port, '1.0.0', entry.requiredPythonFeatures)
      const payload = await entry.load()
      const saved = await createPythonExampleProject(entry, compatible, options())
      expect(saved.kind).toBe(entry.kind)
      expect(saved.mode).toBe(entry.mode ?? (entry.kind === 'pro' ? 'code' : 'blocks'))
      const reopened = await loadSanitizedProjectById(saved.id)
      if (reopened?.programmingLanguage !== 'python') throw new Error('Saved Python game required')
      expect(reopened.kind).toBe(entry.kind)
      expect(reopened.mode).toBe(saved.mode)
      expect(reopened.assets).toEqual(payload.assets ? [...payload.assets] : undefined)
      const exported = await exportProjectSource(reopened, {
        runtimeCatalog: compatible.environments[0]!.context.catalog,
      })
      expect(exported.warnings).toEqual([])
      const files = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
      for (const [path, text] of Object.entries(payload.files))
        expect(files[path]).toEqual(new TextEncoder().encode(text))
      for (const asset of payload.assets ?? []) {
        if (!asset.proPath) throw new Error('Sound path required')
        expect(files[asset.proPath]).toEqual(
          new Uint8Array(Buffer.from(asset.dataUrl.split(',')[1]!, 'base64')),
        )
      }
      expect(files['.sistemazero/python-audio/sz_audio/__init__.py']).toBeInstanceOf(Uint8Array)
      expect(files['turtle.py']).toBeUndefined()
      expect(files['index.html']).toBeUndefined()
    }, entry.kind)
  })

test('the real maze saves fresh projects and exports all source, credits, three sounds and the exact native audio package', async () =>
  fixture(async (port) => {
    const compatible = await withAudio(port)
    const entry = PYTHON_EXAMPLE_SUMMARIES.find(({ key }) => key === 'python:maze-lights')
    if (!entry) throw new Error('Maze entry required')
    const payload = await entry.load()
    if (!payload.assets) throw new Error('Maze assets required')
    const expectedAssets = [...payload.assets]
    let authorizations = 0
    compatible.authorizeExample = async (candidate) => {
      expect(await listAllProjects()).toHaveLength(authorizations)
      expect(candidate.runtime).toEqual(compatible.environments[0]!.context.runtime)
      expect(candidate.assets).toEqual(expectedAssets)
      authorizations++
    }
    const first = await createPythonExampleProject(entry, compatible, options())
    const second = await createPythonExampleProject(entry, compatible, options())
    expect(second.id).not.toBe(first.id)
    expect(authorizations).toBe(2)
    expect(await listAllProjects()).toHaveLength(2)
    const reopened = await loadSanitizedProjectById(first.id)
    if (reopened?.programmingLanguage !== 'python' || reopened.kind !== 'pro')
      throw new Error('Saved Python Pro project required')
    expect(reopened.assets).toEqual(expectedAssets)
    for (const [path, content] of Object.entries(payload.files))
      expect(reopened.tree[path]).toEqual({ kind: 'file', content })
    const exported = await exportProjectSource(reopened, {
      runtimeCatalog: compatible.environments[0]!.context.catalog,
    })
    expect(exported.warnings).toEqual([])
    const files = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    for (const [path, text] of Object.entries(payload.files))
      expect(files[path]).toEqual(new TextEncoder().encode(text))
    for (const asset of payload.assets ?? []) {
      if (!asset.proPath) throw new Error('Sound path required')
      expect(files[asset.proPath]).toEqual(
        Uint8Array.from(atob(asset.dataUrl.split(',')[1]!), (char) => char.charCodeAt(0)),
      )
    }
    const manifest = JSON.parse(
      new TextDecoder().decode(files['.sistemazero/export-manifest.json']),
    )
    expect(manifest.runtime).toEqual(reopened.runtime)
    expect(manifest.source.files.map(({ path }: { path: string }) => path).sort()).toEqual(
      Object.keys(payload.files).sort(),
    )
    expect(manifest.assets.assets.map(({ path }: { path: string }) => path).sort()).toEqual(
      payload.assets?.map(({ proPath }) => proPath).sort(),
    )
    expect(manifest.assets.assets.map(({ id }: { id: string }) => id).sort()).toEqual(
      payload.assets?.map(({ id }) => id).sort(),
    )
    for (const asset of payload.assets ?? [])
      expect(manifest.assets.assets).toContainEqual(
        expect.objectContaining({
          id: asset.id,
          path: asset.proPath,
          name: asset.name,
          source: asset.source,
          kind: 'audio',
          license: asset.license,
        }),
      )
    expect(manifest.runtimeModules).toEqual({
      status: 'known-release',
      modules: [{ importName: 'sz_audio', version: '1.0.0', nativePackage: 'included' }],
    })
    expect(
      new TextDecoder().decode(files['.sistemazero/python-audio/sz_audio/_module.json']),
    ).toContain('"version":"1.0.0"')
    expect(files['.sistemazero/python-audio/sz_audio/__init__.py']).toBeInstanceOf(Uint8Array)
    expect(files['.sistemazero/python-audio/sz_audio/__init__.pyi']).toBeInstanceOf(Uint8Array)
    expect(files['turtle.py']).toBeUndefined()
    expect(files['index.html']).toBeUndefined()
  }))

test('the real race is authorized against the exact prepared runtime and reopens with all five files', async () =>
  fixture(async (port) => {
    const entry = PYTHON_EXAMPLE_SUMMARIES[0]!
    const payload = await entry.load()
    let authorized = 0
    port.authorizeExample = async (candidate) => {
      authorized++
      expect(await listAllProjects()).toEqual([])
      expect(candidate.runtime).toEqual(port.environments[0]!.context.runtime)
      expect(candidate.installedExtensions.map(({ id, version }) => ({ id, version }))).toEqual([
        TURTLE_EXTENSION,
      ])
    }
    const project = await createPythonExampleProject(entry, port, options())
    expect(authorized).toBe(1)
    expect(project.kind).toBe('pro')
    if (project.kind !== 'pro') throw new Error('The authored race requires a Pro project')
    expect(project.mode).toBe('code')
    expect(project.assets).toEqual([])
    expect(Object.keys(project.tree).sort()).toEqual(Object.keys(payload.files).sort())
    const reopened = await loadProjectById(project.id)
    // A load starts a new local writer lineage; compare the portable document, not that symbol.
    expect(JSON.parse(JSON.stringify(reopened))).toEqual(JSON.parse(JSON.stringify(project)))
    for (const [path, content] of Object.entries(payload.files)) {
      expect(project.tree[path]).toEqual({ kind: 'file', content })
    }
  }))

test('real factory, reader and IndexedDB preserve Pro sources and authorize before the only saved candidate', async () =>
  fixture(async (port) => {
    let admitted = false
    port.authorizeExample = async (project) => {
      expect(await listAllProjects()).toEqual([])
      expect(project.kind).toBe('pro')
      expect(project.mode).toBe('code')
      expect(project.runtime).toEqual(port.environments[0]!.context.runtime)
      expect(project.installedExtensions.map(({ id, version }) => ({ id, version }))).toEqual([
        TURTLE_EXTENSION,
      ])
      admitted = true
    }
    const project = await createPythonExampleProject(fixtureEntry(), port, options())
    expect(admitted).toBe(true)
    expect(project.programmingLanguage).toBe('python')
    expect(project).not.toHaveProperty('publication')
    expect(project).not.toHaveProperty('files')
    expect(await loadProjectById(project.id)).toMatchObject({
      id: project.id,
      tree: { 'src/helper.py': { kind: 'file', content: 'value = 7' } },
      python: { entrypoint: 'main.py' },
    })
    expect(await listAllProjects()).toHaveLength(1)
  }))

test('fresh host denial never persists an empty project or a denied extension', async () =>
  fixture(async (port) => {
    port.authorizeExample = async () => {
      throw new Error('Turtle negado')
    }
    await expect(createPythonExampleProject(fixtureEntry(), port, options())).rejects.toThrow(
      'Turtle negado',
    )
    expect(await listAllProjects()).toEqual([])
  }))

test('a release lost during fresh discovery does not fall back to another environment', async () =>
  fixture(async (port) => {
    port.prepare = async () => {
      throw new Error('Release revogada')
    }
    await expect(createPythonExampleProject(fixtureEntry(), port, options())).rejects.toThrow(
      'revogada',
    )
    expect(await listAllProjects()).toEqual([])
  }))

test('profile A→B→A during payload loading cannot create in either profile', async () =>
  fixture(async (port) => {
    const first = captureProjectStorageScope().namespace
    const entry = fixtureEntry(async () => {
      setProjectStorageNamespace(`${first}-b`)
      setProjectStorageNamespace(first)
      return { entrypoint: 'main.py', files: { 'main.py': 'print(1)' } }
    })
    await expect(createPythonExampleProject(entry, port, options())).rejects.toThrow()
    expect(await listAllProjects()).toEqual([])
    setProjectStorageNamespace(`${first}-b`)
    expect(await listAllProjects()).toEqual([])
  }))

test('unmount/cancel during authorization prevents storage after late ACK', async () =>
  fixture(async (port) => {
    const controller = new AbortController()
    port.authorizeExample = async () => {
      controller.abort()
    }
    await expect(
      createPythonExampleProject(fixtureEntry(), port, {
        signal: controller.signal,
        isCurrent: () => true,
      }),
    ).rejects.toThrow()
    expect(await listAllProjects()).toEqual([])
  }))

test('conflicting source paths fail without losing a file or persisting a partial candidate', async () =>
  fixture(async (port) => {
    await expect(
      createPythonExampleProject(
        fixtureEntry(async () => ({
          entrypoint: 'main.py',
          files: { 'main.py': 'print(1)', src: 'file', 'src/helper.py': 'x=1' },
        })),
        port,
        options(),
      ),
    ).rejects.toThrow('conflitantes')
    expect(await listAllProjects()).toEqual([])
  }))

test('missing Pro or unsupported extension never loads a game payload', async () =>
  fixture(async (port) => {
    let loaded = false
    const entry = fixtureEntry(async () => {
      loaded = true
      throw new Error('unexpected payload')
    })
    await expect(
      createPythonExampleProject(entry, { ...port, environments: [] }, options()),
    ).rejects.toThrow('Pro')
    await expect(
      createPythonExampleProject(
        { ...entry, extensions: [{ id: 'unknown', version: '1.0.0' }] },
        port,
        options(),
      ),
    ).rejects.toThrow('compatível')
    expect(loaded).toBe(false)
    expect(await listAllProjects()).toEqual([])
  }))

test('source and licensed media survive the reader, asset hash validation and persisted snapshot', async () =>
  fixture(async (port) => {
    const asset = {
      id: 'own-image',
      name: 'hero',
      kind: 'image' as const,
      source: 'upload' as const,
      proPath: 'assets/hero.png',
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      license: { name: 'Fixture própria', attribution: 'Teste' },
    }
    const project = await createPythonExampleProject(
      fixtureEntry(async () => ({
        entrypoint: 'main.py',
        files: { 'main.py': 'print("imagem")' },
        assets: [asset],
      })),
      port,
      options(),
    )
    expect(project.assets).toEqual([asset])
    expect((await loadProjectById(project.id))?.assets).toEqual([asset])
  }))

test('invalid material cannot be silently dropped or leave a saved candidate', async () =>
  fixture(async (port) => {
    await expect(
      createPythonExampleProject(
        fixtureEntry(async () => ({
          entrypoint: 'main.py',
          files: { 'main.py': 'print(1)' },
          assets: [
            {
              id: 'bad',
              name: 'Inválido',
              kind: 'image',
              source: 'upload',
              proPath: '../escape.png',
              dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
            },
          ],
        })),
        port,
        options(),
      ),
    ).rejects.toThrow()
    expect(await listAllProjects()).toEqual([])
  }))

for (const key of pgzeroKeys)
  test(`${key} creates and reopens its whole program and media; the desktop copy reads every SVG as PNG`, async () => {
    const entry = PYTHON_EXAMPLE_SUMMARIES.find((candidate) => candidate.key === key)
    if (!entry) throw new Error(`Missing Pygame Zero game ${key}`)
    await fixture(async (port) => {
      const payload = await entry.load()
      const saved = await createPythonExampleProject(entry, port, options())
      expect(saved.kind).toBe(entry.kind)
      expect(saved.installedExtensions.map(({ id }) => id)).toEqual(['python-pgzero'])
      const reopened = await loadSanitizedProjectById(saved.id)
      if (reopened?.programmingLanguage !== 'python') throw new Error('Saved Python game required')
      expect(reopened.assets).toEqual(payload.assets ? [...payload.assets] : undefined)
      for (const asset of payload.assets ?? [])
        expect(asset.proPath).toMatch(
          /^(images\/[a-z_0-9]+\.(svg|png)|sounds\/[a-z_]+\.wav|music\/[a-z_]+\.ogg|fonts\/[a-z0-9]+\.ttf)$/,
        )
      const { buildPythonSourceFiles } = await import('../export/pythonSource')
      const sizes: [number, number][] = []
      const { files } = await buildPythonSourceFiles(reopened, null, {
        rasterizeSvg: async (_svg, width, height) => {
          sizes.push([width, height])
          return new Uint8Array([137, 80, 78, 71])
        },
      })
      for (const [path, text] of Object.entries(payload.files)) expect(files[path]).toEqual(text)
      // The text files the game reads with open() (the waves of the space shooter) travel too.
      const game = PGZERO_GAMES.find(
        (candidate) =>
          key === `python:${candidate.key}:blocks` || key === `python:${candidate.key}:code`,
      ) as PgzeroGame
      for (const name of game.dataFiles ?? []) {
        expect(Object.keys(payload.files)).toContain(name)
        expect(files[name]).toBe((payload.files as Record<string, string>)[name])
      }
      // A game with its own font takes the font and its license to the computer.
      if (game.font) {
        expect(files[`fonts/${game.font}.ttf`]).toBeDefined()
        expect(String(files['LICENSE-fonte.txt'])).toContain('SIL OPEN FONT LICENSE')
      }
      const vectors = (payload.assets ?? []).filter(({ proPath }) => proPath?.endsWith('.svg'))
      for (const asset of vectors)
        expect(files[asset.proPath!.replace(/\.svg$/, '.png')]).toBeDefined()
      expect(sizes).toHaveLength(vectors.length)
      expect(files['requisitos-pygame-zero.txt']).toBe('pygame-ce==2.5.8\nnumpy\n')
    }, entry.kind)
  })

for (const key of raylibKeys)
  test(`${key} creates and reopens its whole program and media; the desktop copy takes the real raylib`, async () => {
    const entry = PYTHON_EXAMPLE_SUMMARIES.find((candidate) => candidate.key === key)
    if (!entry) throw new Error(`Missing Raylib game ${key}`)
    await fixture(async (port) => {
      const payload = await entry.load()
      const saved = await createPythonExampleProject(entry, port, options())
      expect(saved.kind).toBe(entry.kind)
      expect(saved.installedExtensions.map(({ id }) => id)).toEqual([entry.extensions[0]!.id])
      const reopened = await loadSanitizedProjectById(saved.id)
      if (reopened?.programmingLanguage !== 'python') throw new Error('Saved Python game required')
      expect(reopened.assets).toEqual(payload.assets ? [...payload.assets] : undefined)
      for (const asset of payload.assets ?? [])
        expect(asset.proPath).toMatch(
          /^(images\/[a-z0-9-]+\.png|sounds\/[a-z0-9-]+\.wav|music\/[a-z0-9-]+\.ogg|fonts\/[a-z0-9]+\.ttf|models\/[a-z0-9-]+\.glb)$/,
        )
      const { buildPythonSourceFiles } = await import('../export/pythonSource')
      const { files } = await buildPythonSourceFiles(reopened, null)
      for (const [path, text] of Object.entries(payload.files)) expect(files[path]).toEqual(text)
      expect(files['requisitos-raylib.txt']).toBe('raylib==6.0.1.0\n')

      // The ZIP the child downloads carries, byte for byte, the very folder the playtests run on
      // the real raylib 6.0.1.0 (scripts/python/raylib-playtest): what plays there plays at home.
      const exported = await exportProjectSource(reopened, {
        runtimeCatalog: port.environments[0]!.context.catalog,
      })
      expect(exported.warnings).toEqual([])
      const zip = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
      const folder = join(import.meta.dir, '../examples/python/raylib', key.split(':')[1]!)
      const onDisk = readdirSync(folder, { recursive: true, withFileTypes: true }).filter((file) =>
        file.isFile(),
      )
      expect(onDisk.length).toBeGreaterThan(3)
      for (const file of onDisk) {
        const path = relative(folder, join(file.parentPath, file.name)).replaceAll('\\', '/')
        expect(zip[path], path).toEqual(new Uint8Array(readFileSync(join(folder, path))))
      }
      expect(new TextDecoder().decode(zip['requisitos-raylib.txt'])).toBe('raylib==6.0.1.0\n')
      // The browser engine never travels: the desktop raylib is the one pip installs.
      for (const path of Object.keys(zip)) expect(path).not.toMatch(/(^|\/)(pyray|raylib)(\.py|\/)/)
      expect(zip['index.html']).toBeUndefined()
    }, entry.kind)
  })

for (const key of pygameKeys)
  test(`${key} creates, reopens and exports its Pygame-ce program, Pinta drawings and sounds`, async () => {
    const entry = PYTHON_EXAMPLE_SUMMARIES.find((candidate) => candidate.key === key)
    if (!entry) throw new Error(`Missing Pygame-ce game ${key}`)
    await fixture(async (port) => {
      port.environments[0]!.context.grantedExtensionIds = ['python-pygame']
      const payload = await entry.load()
      const saved = await createPythonExampleProject(entry, port, options())
      expect(saved.kind).toBe(entry.kind)
      expect(saved.installedExtensions.map(({ id }) => id)).toEqual(['python-pygame'])
      const reopened = await loadSanitizedProjectById(saved.id)
      if (reopened?.programmingLanguage !== 'python') throw new Error('Saved Python game required')
      expect(reopened.assets).toEqual(payload.assets ? [...payload.assets] : undefined)
      const { files } = await (await import('../export/pythonSource')).buildPythonSourceFiles(
        reopened,
        null,
      )
      for (const [path, content] of Object.entries(payload.files))
        expect(files[path]).toEqual(content)
      for (const asset of payload.assets ?? []) {
        expect(asset.proPath).toMatch(/^assets\/[A-Za-z0-9_-]+\.(png|wav|ogg)$/)
        expect(files[asset.proPath!]).toEqual(Buffer.from(asset.dataUrl.split(',')[1]!, 'base64'))
      }
      expect(files['requisitos-pygame-ce.txt']).toBe('pygame-ce==2.5.7\n')
      expect(files['pinta.py']).toContain('def carregar_mapa(nome)')
    }, entry.kind)
  })
