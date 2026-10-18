import { expect, test } from 'bun:test'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { loadPythonAuthoring, pythonOfficialModules } from './authoring'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import { selectPythonPalette } from './selection'

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
  expect([...pythonOfficialModules(installed)]).toEqual(['random', 'math', 'turtle'])
  expect([
    ...pythonOfficialModules({
      ...installed,
      files: { ...installed.files, 'turtle.py': '', 'random/__init__.py': '' },
    }),
  ]).toEqual(['math'])
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
