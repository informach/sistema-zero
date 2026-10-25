import { describe, expect, test } from 'bun:test'
import type { PythonNode } from '../language/types'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import {
  attribute,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  pass,
  text,
  withTargetContext,
} from './nodes'
import { type PythonVisualNode, pythonASTToVisual } from './projection'
import { pythonProjectModules } from './projectModules'
import { pythonResolverOptionsOf } from './resolverOptions'
import type { PythonProjectModules } from './scope'

const level = (value = 0) => ({ literal: 'int' as const, value: String(value) })
const aliases = (names: readonly (string | [string, string])[]) =>
  names.map((item) =>
    node('alias', {
      name: typeof item === 'string' ? item : item[0],
      asname: typeof item === 'string' ? null : item[1],
    }),
  )
const fromImport = (
  module: string | null,
  names: readonly (string | [string, string])[],
  depth = 0,
) => node('ImportFrom', { module, names: aliases(names), level: level(depth) })
const star = (module: string | null, depth = 0) => fromImport(module, ['*'], depth)
const importing = (...names: (string | [string, string])[]) =>
  node('Import', { names: aliases(names) })
const assign = (target: string | PythonNode, value: PythonNode = integer('1')) =>
  node('Assign', {
    targets: [
      typeof target === 'string' ? name(target, 'Store') : withTargetContext(target, 'Store'),
    ],
    value,
    type_comment: null,
  })
const augment = (target: string, value: PythonNode) =>
  node('AugAssign', { target: name(target, 'Store'), op: node('Add'), value })
const strings = (...items: string[]) =>
  node('List', { elts: items.map((item) => text(item)), ctx: node('Load') })
const parameters = () =>
  node('arguments', {
    posonlyargs: [],
    args: [],
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  })
const def = (id: string, body: PythonNode[] = [pass()]) =>
  node('FunctionDef', {
    name: id,
    args: parameters(),
    body,
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
const klass = (id: string, body: PythonNode[] = [pass()]) =>
  node('ClassDef', { name: id, bases: [], keywords: [], body, decorator_list: [], type_params: [] })
const loop = (target: string, iterable: PythonNode, body: PythonNode[] = [pass()]) =>
  node('For', {
    target: name(target, 'Store'),
    iter: iterable,
    body,
    orelse: [],
    type_comment: null,
  })
const withOpen = (file: PythonNode, target: string, body: PythonNode[]) =>
  node('With', {
    items: [
      node('withitem', {
        context_expr: call(name('open'), [file, text('r')]),
        optional_vars: name(target, 'Store'),
      }),
    ],
    body,
    type_comment: null,
  })

function analyse(
  files: Record<string, PythonNode[] | null>,
  options: {
    entrypoint?: string
    extra?: string[]
    starExports?: ReadonlyMap<string, readonly string[]>
  } = {},
) {
  return pythonProjectModules({
    paths: [...Object.keys(files), ...(options.extra ?? [])],
    trees: new Map(Object.entries(files).map(([path, body]) => [path, body && moduleNode(body)])),
    entrypoint: options.entrypoint ?? 'main.py',
    starExports:
      options.starExports ?? pythonResolverOptionsOf(PYTHON_PROGRAMMING_CODECS).starExports,
  })
}
const exportsOf = (
  modules: PythonProjectModules,
  module: string,
): Record<string, unknown> | null | undefined => {
  const found = modules.get(module)
  return found ? Object.fromEntries(found) : found
}
const OTHER = { kind: 'other' }

describe('pythonProjectModules', () => {
  test('exports module-level assignments, defs, classes, imports and statement targets', () => {
    const modules = analyse({
      'main.py': [star('settings')],
      'settings.py': [
        importing('pygame', ['os.path', 'caminho']),
        importing('xml.dom'),
        fromImport('os.path', ['join', ['exists', 'existe']]),
        assign('LARGURA'),
        assign(
          node('Tuple', { elts: [name('A', 'Store'), name('B', 'Store')], ctx: node('Store') }),
        ),
        augment('LARGURA', integer('2')),
        node('AnnAssign', {
          target: name('ALTURA', 'Store'),
          annotation: name('int'),
          value: integer('720'),
          simple: level(1),
        }),
        def('ajudar', [assign('local_da_funcao')]),
        klass('Jogador', [assign('atributo_da_classe')]),
        loop('linha', name('LINHAS')),
        withOpen(text('dados.txt'), 'arquivo', [pass()]),
        node('Try', {
          body: [pass()],
          handlers: [
            node('ExceptHandler', { type: name('OSError'), name: 'erro', body: [pass()] }),
          ],
          orelse: [],
          finalbody: [],
        }),
        assign('_privado'),
        def('_ajudante'),
      ],
    })
    expect(exportsOf(modules, 'settings')).toEqual({
      pygame: { kind: 'module', module: 'pygame' },
      caminho: { kind: 'module', module: 'os.path' },
      xml: { kind: 'module', module: 'xml' },
      join: { kind: 'module', module: 'os.path', member: 'join' },
      existe: { kind: 'module', module: 'os.path', member: 'exists' },
      LARGURA: OTHER,
      A: OTHER,
      B: OTHER,
      ALTURA: OTHER,
      ajudar: OTHER,
      Jogador: OTHER,
      linha: OTHER,
      arquivo: OTHER,
      erro: OTHER,
    })
    // main.py star-imports settings and defines nothing public of its own.
    expect(exportsOf(modules, 'main')).toEqual(exportsOf(modules, 'settings'))
  })

  test('a name bound twice the same way keeps its binding; bound differently it is "other"', () => {
    const modules = analyse({
      'a.py': [importing('pygame'), importing('pygame'), importing('json'), assign('json')],
      'b.py': [def('mudar', [node('Global', { names: ['pygame'] })]), importing('pygame')],
    })
    expect(exportsOf(modules, 'a')).toEqual({
      pygame: { kind: 'module', module: 'pygame' },
      json: OTHER,
    })
    // A function that declares the global can replace it whenever it runs.
    expect(exportsOf(modules, 'b')?.pygame).toEqual(OTHER)
  })

  test('a literal __all__ decides the names, including private ones', () => {
    const modules = analyse({
      'a.py': [
        assign('__all__', strings('_secreto', 'publico')),
        assign('_secreto'),
        assign('publico'),
        assign('outro'),
      ],
      'b.py': [assign('__all__', node('Tuple', { elts: [text('x')], ctx: node('Load') }))],
    })
    expect(exportsOf(modules, 'a')).toEqual({ _secreto: OTHER, publico: OTHER })
    // A listed name not defined still binds something (or fails): never an official name.
    expect(exportsOf(modules, 'b')).toEqual({ x: OTHER })
  })

  test('an __all__ that is not a single literal makes the module unknown', () => {
    const cases: PythonNode[][] = [
      [assign('__all__', call(name('list'), [name('nomes')]))],
      [node('If', { test: name('DEBUG'), body: [assign('__all__', strings('a'))], orelse: [] })],
      [assign('__all__', strings('a')), augment('__all__', strings('b'))],
      [
        assign('__all__', strings('a')),
        expression(call(attribute(name('__all__'), 'append'), [text('open')])),
      ],
      [
        def('exportar', [
          node('Global', { names: ['__all__'] }),
          assign('__all__', strings('open')),
        ]),
      ],
    ]
    for (const body of cases) expect(analyse({ 'a.py': body }).get('a')).toBeNull()
  })

  test('dynamic namespace changes make the module unknown', () => {
    const cases: PythonNode[][] = [
      [
        assign(
          node('Subscript', {
            value: call(name('globals')),
            slice: text('open'),
            ctx: node('Store'),
          }),
          name('print'),
        ),
      ],
      [expression(call(name('exec'), [text('open = print')]))],
      [
        def('trocar', [
          expression(call(name('setattr'), [name('builtins'), text('open'), name('print')])),
        ]),
      ],
      [importing('builtins'), assign(attribute(name('builtins'), 'open'))],
      [importing('sys'), expression(attribute(attribute(name('sys'), 'modules'), 'clear'))],
      [expression(call(attribute(call(name('vars')), 'update'), [name('outros')]))],
    ]
    for (const body of cases) expect(analyse({ 'a.py': body }).get('a')).toBeNull()
    // An attribute written on an ordinary object is not the module namespace.
    const ordinary = analyse({
      'a.py': [
        klass('Bola', [def('mover', [assign(attribute(name('self'), 'x'))])]),
        assign(attribute(call(name('Bola')), 'y')),
      ],
    })
    expect(exportsOf(ordinary, 'a')).toEqual({ Bola: OTHER })
  })

  test('another project file writing into a module makes that module unknown', () => {
    for (const writer of [
      [importing('settings'), assign(attribute(name('settings'), 'open'), name('print'))],
      [
        importing(['settings', 's']),
        expression(call(name('setattr'), [name('s'), text('range'), name('print')])),
      ],
      [fromImport(null, ['settings'], 1)],
    ]) {
      const modules = analyse({
        'main.py': [star('settings')],
        'settings.py': [assign('X')],
        'sprites.py': writer,
      })
      const unknown = writer[0]!.kind === 'Import'
      expect(modules.get('settings') === null).toBe(unknown)
      expect(modules.get('main') === null).toBe(unknown)
    }
  })

  test('star imports recurse through project and known modules', () => {
    const modules = analyse({
      'main.py': [star('sprites')],
      'sprites.py': [star('settings'), klass('Jogador')],
      'settings.py': [star('math'), importing('pygame'), assign('LARGURA'), assign('pi')],
    })
    const sprites = exportsOf(modules, 'sprites')
    expect(sprites?.Jogador).toEqual(OTHER)
    expect(sprites?.LARGURA).toEqual(OTHER)
    expect(sprites?.pygame).toEqual({ kind: 'module', module: 'pygame' })
    expect(sprites?.sqrt).toEqual({ kind: 'module', module: 'math', member: 'sqrt' })
    // settings rebinds math's pi: whoever imports it gets settings' value.
    expect(sprites?.pi).toEqual(OTHER)
    expect(exportsOf(modules, 'main')).toEqual(sprites)
  })

  test('a star import of an unknown module gives no proof, transitively', () => {
    const modules = analyse({
      'main.py': [star('sprites')],
      'sprites.py': [star('settings')],
      'settings.py': [star('os.path')],
      'outro.py': [star('nao_existe')],
    })
    expect(modules.get('settings')).toBeNull()
    expect(modules.get('sprites')).toBeNull()
    expect(modules.get('main')).toBeNull()
    expect(modules.get('outro')).toBeNull()
  })

  test('cyclic star imports terminate with the names of both modules', () => {
    const modules = analyse({
      'a.py': [star('b'), assign('DO_A')],
      'b.py': [star('a'), assign('DO_B')],
      'c.py': [star('c'), assign('PROPRIO')],
    })
    expect(exportsOf(modules, 'a')).toEqual({ DO_A: OTHER, DO_B: OTHER })
    expect(exportsOf(modules, 'b')).toEqual({ DO_A: OTHER, DO_B: OTHER })
    expect(exportsOf(modules, 'c')).toEqual({ PROPRIO: OTHER })
    const unknownCycle = analyse({ 'a.py': [star('b')], 'b.py': [star('a'), star('desconhecido')] })
    expect(unknownCycle.get('a')).toBeNull()
    expect(unknownCycle.get('b')).toBeNull()
  })

  test('module names follow the project import root, packages and shadowing', () => {
    const modules = analyse(
      {
        'jogo/main.py': [star('pacote')],
        'jogo/pacote/__init__.py': [star('partes', 1)],
        'jogo/pacote/partes.py': [assign('PECA'), assign('_interna')],
        'jogo/random.py': [assign('choice')],
        'jogo/quebrado.py': null,
        'fora/settings.py': [assign('X')],
      },
      { entrypoint: 'jogo/main.py', extra: ['jogo/pacote/imagens/fundo.png'] },
    )
    expect(exportsOf(modules, 'pacote.partes')).toEqual({ PECA: OTHER })
    // A package also exposes its submodules once anyone imports them.
    expect(exportsOf(modules, 'pacote')).toEqual({ PECA: OTHER, partes: OTHER, imagens: OTHER })
    // A file named like a standard module may lose to the interpreter's own copy.
    expect(modules.get('random')).toBeNull()
    expect(modules.get('quebrado')).toBeNull()
    // Outside sys.path[0], a file is not importable by that name.
    expect(modules.has('settings')).toBe(false)
  })
})

const ids = (values: PythonVisualNode[]): string[] =>
  values.flatMap((value) =>
    value.kind === 'source'
      ? ['<source>']
      : [value.codecId, ...value.inputs.flatMap((input) => ids(input.nodes))],
  )

describe('from <project module> import * in the blocks', () => {
  const main = [
    star('settings'),
    withOpen(call(name('join'), [text('data'), text('score.txt')]), 'score_file', [
      expression(call(attribute(name('score_file'), 'read'))),
    ]),
    loop('_', call(name('range'), [integer('3')]), [pass()]),
  ]
  const project = (settings: PythonNode[] | null) => {
    const projectModules = analyse({ 'main.py': main, 'settings.py': settings })
    return pythonASTToVisual(moduleNode(main), { projectModules }).body
  }

  test('a readable settings.py lets open and range be the built-ins', () => {
    const body = project([
      importing('pygame'),
      fromImport('os.path', ['join']),
      assign('WINDOW_WIDTH'),
    ])
    expect(body[1]).toMatchObject({ kind: 'block', codecId: 'sz_py_with_open' })
    expect(body[2]).toMatchObject({ kind: 'block', codecId: 'sz_py_repeat' })
    expect(ids(body.slice(1))).not.toContain('<source>')
  })

  test('without the project modules, or with an unknowable settings.py, they stay code', () => {
    expect(pythonASTToVisual(moduleNode(main)).body[1]!.kind).toBe('source')
    for (const settings of [
      null,
      [expression(call(name('exec'), [text('open = print')]))],
      [star('os.path')],
      [assign('__all__', call(name('list'), [name('nomes')]))],
    ]) {
      const body = project(settings)
      expect(body[1]!.kind).toBe('source')
      // The loop stays a generic `for` around a plain call, never the range blocks.
      expect(ids([body[2]!])).not.toContain('sz_py_repeat')
      expect(ids([body[2]!])).not.toContain('sz_py_range')
    }
  })

  test('a settings.py that defines open or range shadows the built-in', () => {
    const body = project([def('open'), assign('range', name('print'))])
    expect(body[1]!.kind).toBe('source')
    expect(ids([body[2]!])).not.toContain('sz_py_repeat')
    expect(ids([body[2]!])).not.toContain('sz_py_range')
    // A private name is not star-exported: the built-in stays.
    const hidden = project([def('_open')])
    expect(hidden[1]).toMatchObject({ kind: 'block', codecId: 'sz_py_with_open' })
  })
})
