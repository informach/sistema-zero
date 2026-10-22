import { expect, test } from 'bun:test'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { integer, moduleNode, node } from '../blocks/nodes'
import { createPythonWorkspaceDraft, updatePythonWorkspaceDraft } from '../blocks/workspaceDraft'
import type { PythonAnalysisSession } from '../language/session'
import type { PythonNode } from '../language/types'
import { inspectPythonTurtleRemoval } from './removalReferences'

function parser(tree: PythonNode | null, onParse = () => {}) {
  let runs = 0
  return {
    count: () => runs,
    async run<T>(request: {
      execute(parser: Pick<PythonAnalysisSession, 'parse' | 'render'>): Promise<T>
    }) {
      runs++
      return request.execute({
        parse: async (identity, source) => {
          onParse()
          return {
            version: 1,
            language: 'python',
            identity,
            source,
            tree,
            tokens: [],
            diagnostics: [],
          }
        },
        render: async () => {
          throw new Error('Unexpected render')
        },
      })
    },
  }
}

test('CPython Import and absolute ImportFrom aliases/nesting report original paths and lines; relative imports stay local', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const source = '# cabeçalho\r\nimport turtle as t\nfrom turtle import Turtle as Pen\n'
  const first = {
    ...node('Import', { names: [node('alias', { name: 'turtle', asname: 't' })] }),
    range: { start: source.indexOf('import'), end: source.indexOf('\nfrom') },
  }
  const second = {
    ...node('ImportFrom', {
      module: 'turtle',
      level: integer('0').fields.value!,
      names: [node('alias', { name: 'Turtle', asname: 'Pen' })],
    }),
    range: { start: source.indexOf('from'), end: source.length },
  }
  const relative = node('ImportFrom', {
    module: 'turtle',
    level: integer('1').fields.value!,
    names: [],
  })
  const analysis = parser(moduleNode([first, node('FunctionDef', { body: [second, relative] })]))
  expect(
    await inspectPythonTurtleRemoval(
      { ...project, files: { 'main.py': source, 'helper.pyi': source } },
      analysis,
      () => {},
    ),
  ).toEqual([
    { path: 'helper.pyi', line: 2 },
    { path: 'helper.pyi', line: 3 },
    { path: 'main.py', line: 2 },
    { path: 'main.py', line: 3 },
  ])
})

test('comments/strings and other module names do not create Turtle dependencies', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const analysis = parser(
    moduleNode([
      node('Expr', { value: node('Constant', { value: 'import turtle' }) }),
      node('Import', { names: [node('alias', { name: 'turtle_game', asname: 'turtle' })] }),
    ]),
  )
  expect(
    await inspectPythonTurtleRemoval(
      { ...project, files: { 'main.py': '# import turtle\nprint("import turtle")\n' } },
      analysis,
      () => {},
    ),
  ).toEqual([])
})

test('only executable local modules at the entrypoint import root shadow official Turtle', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  for (const [path, shadowed] of [
    ['src/turtle.py', true],
    ['src/turtle/__init__.py', true],
    ['src/turtle/helper.py', false],
    ['src/turtle.pyi', false],
    ['turtle.py', false],
  ] as const) {
    const current = {
      ...project,
      python: { ...project.python, entrypoint: 'src/main.py' },
      files: { 'src/main.py': 'import turtle\n', [path]: '' },
    }
    const analysis = parser(
      moduleNode([node('Import', { names: [node('alias', { name: 'turtle', asname: null })] })]),
    )
    const refs = await inspectPythonTurtleRemoval(current, analysis, () => {})
    expect(refs.length === 0).toBe(shadowed)
  }
})

test('invalid syntax, pending visual work and oversized source never qualify removal', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const analysis = parser(null)
  await expect(inspectPythonTurtleRemoval(project, analysis, () => {})).rejects.toThrow('sintaxe')
  const idle = parser(moduleNode([]))
  await expect(
    inspectPythonTurtleRemoval(
      {
        ...project,
        blocksState: updatePythonWorkspaceDraft(
          project,
          'main.py',
          createPythonWorkspaceDraft(project, 'main.py', {}, []),
        ),
      },
      idle,
      () => {},
    ),
  ).rejects.toThrow('rascunho')
  await expect(
    inspectPythonTurtleRemoval(
      { ...project, files: { ...project.files, 'large.py': 'a'.repeat(1024 * 1024 + 1) } },
      idle,
      () => {},
    ),
  ).rejects.toThrow('limite')
  expect(idle.count()).toBe(0)
})
