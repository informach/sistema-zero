import { expect, test } from 'bun:test'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { attribute, call, expression, integer, moduleNode, name, node, pass } from '../blocks/nodes'
import { createPythonWorkspaceDraft, updatePythonWorkspaceDraft } from '../blocks/workspaceDraft'
import type { PythonAnalysisSession } from '../language/session'
import type { PythonNode } from '../language/types'
import { inspectPythonReferences, inspectPythonTurtleRemoval } from './removalReferences'

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

test('Raylib: pyray and raylib imports count, and a local pyray.py hides only pyray', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const source = ['from pyray import *', 'import raylib as rl', ''].join('\n')
  const tree = moduleNode([
    {
      ...node('ImportFrom', {
        module: 'pyray',
        level: integer('0').fields.value!,
        names: [node('alias', { name: '*', asname: null })],
      }),
      range: { start: 0, end: 18 },
    },
    {
      ...node('Import', { names: [node('alias', { name: 'raylib', asname: 'rl' })] }),
      range: { start: source.indexOf('import raylib'), end: source.length },
    },
  ])
  const query = { modules: ['pyray', 'raylib'], label: 'Raylib 2D' }
  const files = { 'main.py': source }
  expect(
    await inspectPythonReferences({ ...project, files }, parser(tree), () => {}, query),
  ).toEqual([
    { path: 'main.py', line: 1 },
    { path: 'main.py', line: 2 },
  ])
  expect(
    await inspectPythonReferences(
      { ...project, files: { ...files, 'pyray.py': '' } },
      parser(tree),
      () => {},
      query,
    ).then((refs) => refs.filter(({ path }) => path === 'main.py')),
  ).toEqual([{ path: 'main.py', line: 2 }])
})

test('Raylib 3D imports resolve snake_case and C names without claiming 2D calls', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const source = [
    'from pyray import *',
    'import raylib as rl',
    'draw_cube(p, 1, 1, 1, RED)',
    'rl.DrawSphere(p, 1, RED)',
    'draw_circle(1, 2, 3, RED)',
    '',
  ].join('\n')
  const at = <T extends PythonNode>(value: T, text: string) => ({
    ...value,
    range: { start: source.indexOf(text), end: source.indexOf(text) + text.length },
  })
  const call = (func: PythonNode) =>
    node('Expr', { value: node('Call', { func, args: [], keywords: [] }) })
  const name = (id: string) => at(node('Name', { id, ctx: node('Load') }), id)
  const tree = moduleNode([
    node('ImportFrom', {
      module: 'pyray',
      level: integer('0').fields.value!,
      names: [node('alias', { name: '*', asname: null })],
    }),
    node('Import', { names: [node('alias', { name: 'raylib', asname: 'rl' })] }),
    call(name('draw_cube')),
    call(
      at(
        node('Attribute', {
          value: node('Name', { id: 'rl', ctx: node('Load') }),
          attr: 'DrawSphere',
          ctx: node('Load'),
        }),
        'rl.DrawSphere',
      ),
    ),
    call(name('draw_circle')),
  ])
  const refs = await inspectPythonReferences(
    { ...project, files: { 'main.py': source } },
    parser(tree),
    () => {},
    {
      modules: ['pyray', 'raylib'],
      label: 'Raylib 3D',
      names: new Set(['draw_cube', 'DrawSphere']),
    },
  )
  // The two 3D calls (lines 3 and 4), never the 2D one.
  expect(refs.map(({ line }) => line)).toEqual([3, 4])
})

test('Raylib 3D renamed imports are dependencies, while a local method with that spelling is not', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const query = { modules: ['pyray', 'raylib'], label: 'Raylib 3D', names: new Set(['draw_cube']) }
  const imported = node('ImportFrom', {
    module: 'pyray',
    level: integer('0').fields.value!,
    names: [node('alias', { name: 'draw_cube', asname: 'cubo' })],
  })
  const refs = await inspectPythonReferences(
    {
      ...project,
      files: { 'main.py': 'from pyray import draw_cube as cubo\ncubo(p, 1, 1, 1, RED)\n' },
    },
    parser(moduleNode([imported, expression(call(name('cubo')))])),
    () => {},
    query,
  )
  expect(refs).not.toHaveLength(0)
  const local = await inspectPythonReferences(
    { ...project, files: { 'main.py': 'desenho.draw_cube()\n' } },
    parser(moduleNode([expression(call(attribute(name('desenho'), 'draw_cube')))])),
    () => {},
    query,
  )
  expect(local).toEqual([])
})

test('Pygame Zero removal recognizes injected builtins and callbacks only in the entrypoint', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const query = {
    modules: ['pgzero', 'pgzrun', 'pygame'],
    label: 'Pygame Zero',
    provided: { provider: 'pgzero', names: ['Actor'], handlers: ['draw'] },
  }
  const tree = moduleNode([expression(call(name('Actor')))])
  expect(
    await inspectPythonReferences(
      { ...project, files: { 'main.py': "Actor('heroi')\n" } },
      parser(tree),
      () => {},
      query,
    ),
  ).toEqual([{ path: 'main.py', line: 1 }])
  const assignedHandler = moduleNode([
    node('Assign', {
      targets: [name('draw', 'Store')],
      value: call(name('create_draw')),
      type_comment: null,
    }),
  ])
  expect(
    await inspectPythonReferences(
      { ...project, files: { 'main.py': 'draw = create_draw()\n' } },
      parser(assignedHandler),
      () => {},
      query,
    ),
  ).toEqual([{ path: 'main.py', line: 1 }])
  expect(
    await inspectPythonReferences(
      { ...project, files: { 'main.py': '', 'helper.py': "Actor('heroi')\n" } },
      parser(tree),
      () => {},
      query,
    ).then((refs) => refs.filter(({ path }) => path === 'helper.py')),
  ).toEqual([])
  const local = moduleNode([
    node('Assign', {
      targets: [name('Actor', 'Store')],
      value: name('MinhaClasse'),
      type_comment: null,
    }),
    expression(call(name('Actor'))),
  ])
  expect(
    await inspectPythonReferences(
      { ...project, files: { 'main.py': 'Actor = MinhaClasse\nActor()\n' } },
      parser(local),
      () => {},
      query,
    ),
  ).toEqual([])
  const handler = moduleNode([
    node('FunctionDef', {
      name: 'draw',
      args: node('arguments', {
        posonlyargs: [],
        args: [],
        vararg: null,
        kwonlyargs: [],
        kw_defaults: [],
        kwarg: null,
        defaults: [],
      }),
      body: [pass()],
      decorator_list: [],
      returns: null,
      type_comment: null,
      type_params: [],
    }),
  ])
  expect(
    await inspectPythonReferences(
      { ...project, files: { 'main.py': 'def draw():\n    pass\n' } },
      parser(handler),
      () => {},
      query,
    ),
  ).toEqual([{ path: 'main.py', line: 1 }])
})
