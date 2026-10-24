import { expect, test } from 'bun:test'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { loadPythonAuthoring, pythonOfficialModules } from './authoring'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import { attribute, call, expression, integer, moduleNode, name, node } from './nodes'
import { pythonASTToVisual } from './projection'
import { selectPythonPalette } from './selection'

test('compound blocks require the selected release feature even when every block ID is approved', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const { PYTHON_TURTLE_CODECS } = await import('../extensions/turtle/catalog')
  const blockIds = [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS].map(({ id }) => id)
  environment.pythonAuthoring = [{ runtime: project.runtime, blockIds }]
  const old = selectStudioRuntimeRelease(environment.catalog, project.runtime)!
  const release = await createStudioRuntimeRelease({
    ...old.manifest,
    releaseId: 'compound-test',
    python: { ...old.manifest.python!, features: ['turtle-compound-shapes'] },
  })
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        ...environment.catalog.profiles[0]!,
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const installedExtensions = [{ ...TURTLE_EXTENSION, installedAt: 1 }]
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const withFeature = { ...environment, catalog, pythonAuthoring: [{ runtime, blockIds }] }
  const supported = await loadPythonAuthoring({ runtime, installedExtensions }, withFeature)
  const withoutCapability = await loadPythonAuthoring(
    { runtime: project.runtime, installedExtensions },
    environment,
  )
  for (const id of ['sz_py_turtle_new_shape', 'sz_py_turtle_shape_addcomponent']) {
    expect(supported.codecs.some((codec) => codec.id === id)).toBe(true)
    expect(supported.catalog.some((entry) => entry.id === id)).toBe(true)
    expect(withoutCapability.codecs.some((codec) => codec.id === id)).toBe(false)
    expect(withoutCapability.catalog.some((entry) => entry.id === id)).toBe(false)
  }
  expect((await loadPythonAuthoring({ runtime, installedExtensions }, withFeature)).catalog).toBe(
    supported.catalog,
  )
})

test('the actual authoring loader prefers official Turtle labels and retains generic calls after rebinding', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  environment.pythonAuthoring = [{ runtime: project.runtime, blockIds: [] }]
  const loaded = await loadPythonAuthoring(
    { ...project, installedExtensions: [TURTLE_EXTENSION] },
    environment,
  )
  const importing = node('Import', { names: [node('alias', { name: 'turtle', asname: null })] })
  const moving = expression(call(attribute(name('turtle'), 'forward'), [integer('40')]))
  const projectTree = (body: ReturnType<typeof node>[]) =>
    pythonASTToVisual(moduleNode(body), {
      codecs: loaded.codecs,
      officialModules: new Set(['turtle']),
    })
  const official = projectTree([importing, moving]).body[1]
  if (official?.kind !== 'block') throw new Error('Expected a visual statement')
  expect(official).toMatchObject({ codecId: 'sz_py_turtle_turtle_forward' })
  const rebound = projectTree([
    importing,
    node('Assign', { targets: [name('turtle', 'Store')], value: integer('1'), type_comment: null }),
    moving,
  ]).body[2]
  if (rebound?.kind !== 'block') throw new Error('Expected a visual statement')
  expect(rebound).toMatchObject({ codecId: 'sz_py_method' })
})

test('authoring approval belongs to the exact host release, not the project', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  await expect(loadPythonAuthoring(project, environment)).rejects.toThrow('não estão disponíveis')
  environment.pythonAuthoring = [
    { runtime: { ...project.runtime, manifestSha256: 'b'.repeat(64) }, blockIds: [] },
  ]
  await expect(loadPythonAuthoring(project, environment)).rejects.toThrow('não estão disponíveis')
  environment.pythonAuthoring = [
    { runtime: project.runtime, blockIds: PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id) },
  ]
  const loaded = await loadPythonAuthoring(project, environment)
  expect(loaded.codecs).toBe(PYTHON_PROGRAMMING_CODECS)
  expect(loaded.installedExtensions.size).toBe(0)
  expect(
    selectPythonPalette({ ...loaded, level: 1 }).entries.every(
      (entry) => entry.owner === 'programming',
    ),
  ).toBe(true)
})

test('Turtle is a separate installed extension with a matching approved version', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  environment.pythonAuthoring = [{ runtime: project.runtime, blockIds: [] }]
  const installed = { ...project, installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }] }
  expect(
    (await loadPythonAuthoring(installed, environment)).codecs.some(
      (codec) => codec.owner === TURTLE_EXTENSION.id,
    ),
  ).toBe(true)
  expect(
    (
      await loadPythonAuthoring(
        {
          ...installed,
          installedExtensions: [{ ...TURTLE_EXTENSION, version: '99.0.0' }],
        },
        environment,
      )
    ).codecs,
  ).toBe(PYTHON_PROGRAMMING_CODECS)
})

test('local modules and packages suppress official labels in classic and Pro', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('fixture')
  const installed = { ...project, installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }] }
  expect([...pythonOfficialModules(installed)]).toEqual([
    'random',
    'math',
    'time',
    'turtle',
    'sz_audio',
  ])
  expect([
    ...pythonOfficialModules({
      ...installed,
      files: { ...installed.files, 'turtle.py': '', 'random/__init__.py': '' },
    }),
  ]).toEqual(['math', 'time', 'sz_audio'])
  // Pygame Zero's names are official only with its extension installed.
  expect(
    pythonOfficialModules({
      ...project,
      installedExtensions: [{ id: 'python-pgzero', version: '1.0.0', installedAt: 1 }],
    }).has('pgzero'),
  ).toBe(true)
  expect(pythonOfficialModules(installed).has('pgzero')).toBe(false)
  const { project: pro } = await pythonEnvironmentFixture('pro')
  if (pro.kind !== 'pro') throw new Error('fixture')
  expect(
    pythonOfficialModules({
      ...pro,
      python: { ...pro.python, entrypoint: 'src/main.py' },
      tree: { ...pro.tree, 'src/math.py': { kind: 'file', content: '' } },
    }).has('math'),
  ).toBe(false)
})
