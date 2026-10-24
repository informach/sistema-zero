import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { PYTHON_TURTLE_CODECS } from '../extensions/turtle/catalog'
import type { PythonNode } from '../language/types'
import { optional, pythonApiCallCodec, required } from './apiCallCodec'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual, registerPythonBlocks } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import { pythonCodecIndex } from './codecIndex'
import {
  attribute,
  boolean,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  pass,
  pythonSemanticTree,
  text,
} from './nodes'
import { pythonPaletteBlockState } from './paletteBlocks'
import { type PythonVisualNode, pythonASTToVisual, pythonVisualToAST } from './projection'
import { pythonBindingResolver } from './scope'
import { samePythonValue } from './semantic'

const codecs = [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS]
const ids = (values: PythonVisualNode[]): string[] =>
  values.flatMap((value) =>
    value.kind === 'source'
      ? ['<source>']
      : [value.codecId, ...value.inputs.flatMap((input) => ids(input.nodes))],
  )
const project = (body: PythonNode[], modules = ['turtle', 'math', 'random']) =>
  pythonASTToVisual(moduleNode(body), { codecs, officialModules: new Set(modules) })
const exact = (body: PythonNode[]) => {
  const projection = project(body)
  expect(pythonSemanticTree(pythonVisualToAST(projection, codecs))).toEqual(
    pythonSemanticTree(moduleNode(body)),
  )
  return ids(projection.body)
}
const fn = (fnName: string, body: PythonNode[], args: string[] = []) =>
  node('FunctionDef', {
    name: fnName,
    args: node('arguments', {
      posonlyargs: [],
      args: args.map((arg) => node('arg', { arg, annotation: null, type_comment: null })),
      vararg: null,
      kwonlyargs: [],
      kw_defaults: [],
      kwarg: null,
      defaults: [],
    }),
    body,
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })

test('semantic equality ignores ids and ranges but not syntax', () => {
  const a = { ...integer('1'), id: '7', range: { start: 0, end: 1 } }
  expect(samePythonValue(a, integer('1'))).toBe(true)
  expect(samePythonValue(integer('1'), integer('2'))).toBe(false)
  expect(samePythonValue(call(name('f'), [integer('1')]), call(name('f'), [integer('1')]))).toBe(
    true,
  )
  expect(samePythonValue(call(name('f')), call(name('g')))).toBe(false)
  expect(samePythonValue(node('X', { a: null }), node('X', {}))).toBe(false)
})

test('the projection index only offers codecs that can decode the node', () => {
  const index = pythonCodecIndex(codecs)
  const forward = index.candidates(
    expression(call(attribute(name('turtle'), 'forward'), [integer('1')])),
  )
  // The specific command and the generic fallbacks, never unrelated APIs.
  expect(forward.length).toBeLessThan(8)
  expect(forward.map((codec) => codec.id)).toContain('sz_py_turtle_turtle_forward')
  expect(forward.map((codec) => codec.id)).not.toContain('sz_py_print')
  // Catalog priority is kept: the official API before the generic method call.
  const order = forward.map((codec) => codec.id)
  expect(order.indexOf('sz_py_turtle_turtle_forward')).toBeLessThan(order.indexOf('sz_py_method'))
  expect(index.candidates(integer('3')).map((codec) => codec.id)).toContain('sz_py_integer')
  expect(index.candidates(integer('3')).length).toBeLessThan(6)
})

test('API calls keep positional/named spelling, optional sockets and extra values exactly', () => {
  const codec = pythonApiCallCodec({
    id: 'sz_py_test_write',
    owner: 'programming',
    title: 'escrever',
    category: 'Textos',
    level: 1,
    role: 'statement',
    help: '',
    api: 'escrever()',
    callee: { kind: 'path', path: ['escrever'] },
    params: [
      required('texto', 'texto', () => text('oi')),
      optional('tamanho', 'tamanho', () => integer('10')),
      optional('cor', 'cor', () => text('red'), 'kw'),
    ],
    variadic: undefined,
  })
  const cases = [
    call(name('escrever'), [text('a')]),
    call(name('escrever'), [text('a'), integer('3')]),
    call(name('escrever'), [], [node('keyword', { arg: 'texto', value: text('a') })]),
    call(
      name('escrever'),
      [text('a')],
      [
        node('keyword', { arg: 'cor', value: text('blue') }),
        node('keyword', { arg: 'tamanho', value: integer('2') }),
      ],
    ),
  ]
  for (const value of cases) {
    const statement = expression(value)
    const shape = codec.decode(statement)
    expect(shape).toBeDefined()
    expect(pythonSemanticTree(codec.encode(shape!))).toEqual(pythonSemanticTree(statement))
  }
  // Unknown keywords, *args and missing required values stay with the generic blocks.
  expect(
    codec.decode(
      expression(call(name('escrever'), [], [node('keyword', { arg: 'x', value: integer('1') })])),
    ),
  ).toBeUndefined()
  expect(
    codec.decode(
      expression(
        call(name('escrever'), [node('Starred', { value: name('a'), ctx: node('Load') })]),
      ),
    ),
  ).toBeUndefined()
  expect(codec.decode(expression(call(name('escrever'))))).toBeUndefined()
  // Enabling an optional socket starts with its documented default, in signature order.
  const shape = codec.decode(expression(cases[0]!))!
  const enabled = codec.reshape!(shape, 'cor:present', true)
  expect(enabled.inputs.map((input) => input.name)).toEqual(['texto', 'cor'])
  expect(pythonSemanticTree(codec.encode(enabled))).toEqual(
    pythonSemanticTree(
      expression(
        call(name('escrever'), [text('a')], [node('keyword', { arg: 'cor', value: text('red') })]),
      ),
    ),
  )
  // A positional value after a removed optional one becomes a named value, never shifts.
  const both = codec.decode(expression(cases[1]!))!
  const reordered = codec.reshape!(
    codec.reshape!(both, 'tamanho:present', false),
    'tamanho:present',
    true,
  )
  expect(reordered.inputs.map((input) => input.name)).toEqual(['texto', 'tamanho'])
})

test('if/elif/else is one flat block that round-trips and grows from its options', () => {
  const chain = node('If', {
    test: name('a'),
    body: [pass()],
    orelse: [
      node('If', { test: name('b'), body: [expression(call(name('print')))], orelse: [pass()] }),
    ],
  })
  expect(exact([chain])).toEqual(['sz_py_if', 'sz_py_variable', 'sz_py_variable', 'sz_py_print'])
  const codec = codecs.find((item) => item.id === 'sz_py_if')!
  const grown = codec.reshape!(
    codec.reshape!(codec.decode(codec.defaultNode())!, 'elif:count', 2),
    'orelse:present',
    true,
  )
  expect(grown.inputs.map((input) => input.name)).toEqual([
    'test:0',
    'body:0',
    'test:1',
    'body:1',
    'test:2',
    'body:2',
    'orelse',
  ])
  const encoded = codec.encode(grown)
  expect(encoded.kind).toBe('If')
  expect(((encoded.fields.orelse as PythonNode[])[0]!.fields.orelse as PythonNode[])[0]!.kind).toBe(
    'If',
  )
})

test('everyday syntax has blocks: repeat, forever, def, call, slice, comprehension, global, f-format', () => {
  const body = [
    node('For', {
      target: name('_', 'Store'),
      iter: call(name('range'), [integer('3')]),
      body: [pass()],
      orelse: [],
      type_comment: null,
    }),
    node('While', { test: boolean(true), body: [node('Break')], orelse: [] }),
    fn(
      'pular',
      [node('Global', { names: ['pontos'] }), expression(call(name('mover'), [integer('1')]))],
      ['altura'],
    ),
    node('Assign', {
      targets: [name('meio', 'Store')],
      value: node('Subscript', {
        value: name('lista'),
        slice: node('Slice', { lower: integer('1'), upper: null, step: null }),
        ctx: node('Load'),
      }),
      type_comment: null,
    }),
    node('Assign', {
      targets: [name('dobro', 'Store')],
      value: node('ListComp', {
        elt: node('BinOp', { left: name('x'), op: node('Mult'), right: integer('2') }),
        generators: [
          node('comprehension', {
            target: name('x', 'Store'),
            iter: name('lista'),
            ifs: [],
            is_async: { literal: 'int', value: '0' },
          }),
        ],
      }),
      type_comment: null,
    }),
    node('Assign', {
      targets: [name('texto', 'Store')],
      value: node('JoinedStr', {
        values: [
          node('FormattedValue', {
            value: name('t'),
            conversion: { literal: 'int', value: '-1' },
            format_spec: node('JoinedStr', { values: [text('.1f')] }),
          }),
        ],
      }),
      type_comment: null,
    }),
    node('Assign', {
      targets: [name('a', 'Store'), name('b', 'Store')],
      value: integer('0'),
      type_comment: null,
    }),
  ]
  const used = exact(body)
  expect(used).not.toContain('<source>')
  for (const id of [
    'sz_py_repeat',
    'sz_py_forever',
    'sz_py_def',
    'sz_py_global',
    'sz_py_run',
    'sz_py_slice',
    'sz_py_list_comprehension',
    'sz_py_format_spec',
    'sz_py_assign_many',
  ])
    expect(used).toContain(id)
})

test('scope: global redirects one name, user built-ins shadow, literal kinds are proven', () => {
  const tree = moduleNode([
    node('Assign', {
      targets: [name('itens', 'Store')],
      value: node('List', { elts: [], ctx: node('Load') }),
      type_comment: null,
    }),
    fn('somar', [
      node('Global', { names: ['itens'] }),
      expression(call(attribute(name('itens'), 'remove'), [integer('1')])),
    ]),
    node('Assign', { targets: [name('Actor', 'Store')], value: integer('3'), type_comment: null }),
  ])
  const builtins = new Map([
    ['Actor', { provider: 'pgzero', constructs: 'Actor' }],
    ['screen', { provider: 'pgzero' }],
  ])
  const resolver = pythonBindingResolver(tree, new Set(['pgzero']), new Set(), { builtins })
  const remove = ((tree.fields.body as PythonNode[])[1]!.fields.body as PythonNode[])[1]!.fields
    .value as PythonNode
  const receiver = (remove.fields.func as PythonNode).fields.value as PythonNode
  expect(resolver.receiverKind(receiver)).toBe('List')
  const screen = name('screen')
  // An unbound provided name resolves; a name the child assigned does not.
  expect(resolver({ ...screen }, { root: 'screen', builtin: 'pgzero' })).toBe(true)
  expect(resolver(tree, { root: 'Actor', builtin: 'pgzero' })).toBe(false)
  const uninstalled = pythonBindingResolver(tree, new Set(), new Set(), { builtins })
  expect(uninstalled(tree, { root: 'screen', builtin: 'pgzero' })).toBe(false)
})

test('every palette block starts complete and loads in Blockly with its shadows', () => {
  registerPythonBlocks(codecs)
  const workspace = new Blockly.Workspace()
  try {
    for (const codec of codecs) {
      if (codec.hidden) continue
      const info = pythonPaletteBlockState(codec, codecs)
      const { kind: _kind, ...state } = info
      const block = Blockly.serialization.blocks.append(
        state as Blockly.serialization.blocks.State,
        workspace,
      )
      for (const input of block.inputList)
        if (input.connection?.type === Blockly.ConnectionType.INPUT_VALUE)
          expect(block.getInputTargetBlock(input.name), `${codec.id} ${input.name}`).not.toBeNull()
      // The palette block is a valid program fragment as it arrives.
      const roots = codec.role === 'statement' ? [block.id] : []
      if (roots.length) {
        const visual = pythonWorkspaceToVisual(workspace, roots, [], codecs)
        let kind: string | undefined
        try {
          kind = pythonVisualToAST(visual, codecs).kind
        } catch (error) {
          throw new Error(`${codec.id}: ${(error as Error).message}`)
        }
        expect(kind).toBe('Module')
      }
      block.dispose(false)
    }
  } finally {
    workspace.dispose()
  }
})

test('Blockly keeps how a call was written (alias, module root) through save and load', () => {
  const original = moduleNode([
    node('Import', { names: [node('alias', { name: 'turtle', asname: 't' })] }),
    expression(call(attribute(name('t'), 'fd'), [integer('5')])),
  ])
  const projection = pythonASTToVisual(original, { codecs, officialModules: new Set(['turtle']) })
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(projection, workspace, codecs)
    const saved = Blockly.serialization.workspaces.save(workspace)
    workspace.clear()
    Blockly.serialization.workspaces.load(saved, workspace)
    const back = pythonVisualToAST(pythonWorkspaceToVisual(workspace, roots, [], codecs), codecs)
    expect(pythonSemanticTree(back)).toEqual(pythonSemanticTree(original))
  } finally {
    workspace.dispose()
  }
})

test('files: open with a mode, read and write are blocks that round-trip exactly', () => {
  const opened = (mode: string, body: PythonNode[]) =>
    node('With', {
      items: [
        node('withitem', {
          context_expr: call(name('open'), [text('recorde.txt'), text(mode)]),
          optional_vars: name('arquivo', 'Store'),
        }),
      ],
      body,
      type_comment: null,
    })
  const used = exact([
    opened('w', [expression(call(attribute(name('arquivo'), 'write'), [text('10')]))]),
    opened('r', [
      node('Assign', {
        targets: [name('recorde', 'Store')],
        value: call(name('int'), [call(attribute(name('arquivo'), 'read'))]),
        type_comment: null,
      }),
    ]),
    node('Assign', {
      targets: [name('itens', 'Store')],
      value: node('List', { elts: [], ctx: node('Load') }),
      type_comment: null,
    }),
    expression(call(attribute(name('itens'), 'clear'))),
  ])
  for (const id of ['sz_py_with_open', 'sz_py_file_write', 'sz_py_file_read', 'sz_py_list_clear'])
    expect(used).toContain(id)
  expect(used).not.toContain('<source>')
  // An unknown mode (binary) stays Python source instead of a wrong block.
  expect(exact([opened('rb', [pass()])])).not.toContain('sz_py_with_open')
})

test('a list filled only with Actor(...) makes its loop target an actor; anything else does not', async () => {
  const { PYTHON_PGZERO_CODECS, PGZERO_RESOLVER_OPTIONS } = await import(
    '../extensions/pgzero/catalog'
  )
  const { attachPythonResolverOptions } = await import('./resolverOptions')
  const pgzero = attachPythonResolverOptions(
    [...PYTHON_PGZERO_CODECS, ...PYTHON_PROGRAMMING_CODECS],
    PGZERO_RESOLVER_OPTIONS,
  )
  const program = (extra: PythonNode[] = []) =>
    moduleNode([
      node('Assign', {
        targets: [name('estrelas', 'Store')],
        value: node('List', { elts: [], ctx: node('Load') }),
        type_comment: null,
      }),
      expression(
        call(attribute(name('estrelas'), 'append'), [call(name('Actor'), [text('estrela')])]),
      ),
      ...extra,
      fn('draw', [
        node('For', {
          target: name('estrela', 'Store'),
          iter: name('estrelas'),
          body: [expression(call(attribute(name('estrela'), 'draw')))],
          orelse: [],
          type_comment: null,
        }),
      ]),
    ])
  const usedIn = (tree: PythonNode) => {
    const projection = pythonASTToVisual(tree, {
      codecs: pgzero,
      officialModules: new Set(['pgzero', 'pgzrun']),
    })
    expect(pythonSemanticTree(pythonVisualToAST(projection, pgzero))).toEqual(
      pythonSemanticTree(tree),
    )
    return ids(projection.body)
  }
  expect(usedIn(program())).toContain('sz_py_pgzero_actor_draw')
  const mixed = usedIn(
    program([expression(call(attribute(name('estrelas'), 'append'), [integer('3')]))]),
  )
  expect(mixed).not.toContain('sz_py_pgzero_actor_draw')
  expect(mixed).toContain('sz_py_method')
  const inserted = usedIn(
    program([
      expression(call(attribute(name('estrelas'), 'insert'), [integer('0'), call(name('pegar'))])),
    ]),
  )
  expect(inserted).not.toContain('sz_py_pgzero_actor_draw')
})

test('a list written with actors inside also makes its loop target an actor', async () => {
  const { PYTHON_PGZERO_CODECS, PGZERO_RESOLVER_OPTIONS } = await import(
    '../extensions/pgzero/catalog'
  )
  const { attachPythonResolverOptions } = await import('./resolverOptions')
  const pgzero = attachPythonResolverOptions(
    [...PYTHON_PGZERO_CODECS, ...PYTHON_PROGRAMMING_CODECS],
    PGZERO_RESOLVER_OPTIONS,
  )
  const loop = node('For', {
    target: name('ninho', 'Store'),
    iter: name('ninhos'),
    body: [expression(call(attribute(name('ninho'), 'draw')))],
    orelse: [],
    type_comment: null,
  })
  const listOf = (...elts: PythonNode[]) =>
    node('Assign', {
      targets: [name('ninhos', 'Store')],
      value: node('List', { elts, ctx: node('Load') }),
      type_comment: null,
    })
  const used = (first: PythonNode) =>
    ids(
      pythonASTToVisual(moduleNode([first, fn('draw', [loop])]), {
        codecs: pgzero,
        officialModules: new Set(['pgzero', 'pgzrun']),
      }).body,
    )
  expect(
    used(listOf(call(name('Actor'), [text('ovos')]), call(name('Actor'), [text('ovos')]))),
  ).toContain('sz_py_pgzero_actor_draw')
  expect(used(listOf(call(name('Actor'), [text('ovos')]), integer('1')))).not.toContain(
    'sz_py_pgzero_actor_draw',
  )
})
