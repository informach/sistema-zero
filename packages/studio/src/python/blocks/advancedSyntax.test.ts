import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { PythonNode } from '../language/types'
import {
  type PythonBlocklyBlock,
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
  registerPythonBlocks,
} from './blockly'
import { PYTHON_PROGRAMMING_CODEC_BY_ID, PYTHON_PROGRAMMING_CODECS } from './catalog'
import {
  attribute,
  boolean,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  none,
  pass,
  pythonSemanticTree,
  text,
} from './nodes'
import { pythonPaletteBlockState } from './paletteBlocks'
import { type PythonVisualNode, pythonASTToVisual, pythonVisualToAST } from './projection'
import { PYTHON_MAX_ITEMS } from './shapeControls'

const arg = (id: string) => node('arg', { arg: id, annotation: null, type_comment: null })
const args = (names: string[], extra: Record<string, unknown> = {}) =>
  node('arguments', {
    posonlyargs: [],
    args: names.map(arg),
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
    ...(extra as Record<string, PythonNode | PythonNode[] | null>),
  })
const def = (id: string, parameters: PythonNode, decorators: PythonNode[] = [], body = [pass()]) =>
  node('FunctionDef', {
    name: id,
    args: parameters,
    body,
    decorator_list: decorators,
    returns: null,
    type_comment: null,
    type_params: [],
  })
const assign = (target: string, value: PythonNode) =>
  node('Assign', { targets: [name(target, 'Store')], value, type_comment: null })
const clause = (target: PythonNode, iter: PythonNode, ifs: PythonNode[] = []) =>
  node('comprehension', { target, iter, ifs, is_async: { literal: 'int', value: '0' } })
const compare = (left: PythonNode, op: string, right: PythonNode) =>
  node('Compare', { left, ops: [node(op)], comparators: [right] })
const equalTo = (value: PythonNode) => node('MatchValue', { value })
const capture = (id: string | null, pattern: PythonNode | null = null) =>
  node('MatchAs', { pattern, name: id })
const caseOf = (pattern: PythonNode, guard: PythonNode | null = null, body = [pass()]) =>
  node('match_case', { pattern, guard, body })
const tuple = (...items: PythonNode[]) => node('Tuple', { elts: items, ctx: node('Load') })

function opaque(values: PythonVisualNode[]): number {
  return values.reduce(
    (total, value) =>
      total +
      (value.kind === 'source'
        ? 1
        : value.inputs.reduce((sum, input) => sum + opaque(input.nodes), 0)),
    0,
  )
}
function codecIds(values: PythonVisualNode[]): string[] {
  return values.flatMap((value) =>
    value.kind === 'source'
      ? []
      : [value.codecId, ...value.inputs.flatMap((input) => codecIds(input.nodes))],
  )
}
/** Projection, a real Blockly save/load and the way back keep the exact AST. */
function roundtrip(original: PythonNode) {
  registerPythonBlocks()
  const first = new Blockly.Workspace(),
    second = new Blockly.Workspace()
  try {
    const projection = pythonASTToVisual(original)
    expect(opaque(projection.body)).toBe(0)
    const roots = pythonVisualToWorkspace(projection, first)
    Blockly.serialization.workspaces.load(Blockly.serialization.workspaces.save(first), second)
    expect(pythonSemanticTree(pythonVisualToAST(pythonWorkspaceToVisual(second, roots)))).toEqual(
      pythonSemanticTree(original),
    )
    return codecIds(projection.body)
  } finally {
    first.dispose()
    second.dispose()
  }
}

const NEW_IDS = [
  'sz_py_parameters_full',
  'sz_py_decorated_function',
  'sz_py_decorated_class',
  'sz_py_comprehension_for',
  'sz_py_list_built',
  'sz_py_set_built',
  'sz_py_generator',
  'sz_py_dict_built',
  'sz_py_bitwise',
  'sz_py_invert',
  'sz_py_update_bits',
  'sz_py_match',
  'sz_py_case',
  'sz_py_case_value',
  'sz_py_case_singleton',
  'sz_py_case_default',
  'sz_py_case_capture',
  'sz_py_case_or',
  'sz_py_case_sequence',
  'sz_py_case_star',
  'sz_py_case_mapping',
  'sz_py_case_class',
]

test('each advanced syntax block has a lossless example that the palette loads in Blockly', () => {
  registerPythonBlocks()
  const workspace = new Blockly.Workspace()
  try {
    for (const id of NEW_IDS) {
      const codec = PYTHON_PROGRAMMING_CODEC_BY_ID.get(id)
      expect(codec, id).toBeDefined()
      expect(codec!.level, id).toBeGreaterThanOrEqual(2)
      const example = codec!.defaultNode()
      expect(pythonSemanticTree(codec!.encode(codec!.decode(example)!)), id).toEqual(
        pythonSemanticTree(example),
      )
      const block = workspace.newBlock(id) as PythonBlocklyBlock
      const restored = Blockly.serialization.blocks.append(
        Blockly.serialization.blocks.save(block)!,
        workspace,
      ) as PythonBlocklyBlock
      expect(restored.pythonState.layout, id).toEqual(block.pythonState.layout)
    }
  } finally {
    workspace.dispose()
  }
})

test('*args, **kwargs, keyword-only and positional-only parameters open in blocks', () => {
  const full = args(['a', 'b'], {
    posonlyargs: [arg('origem')],
    defaults: [integer('1')],
    vararg: arg('resto'),
    kwonlyargs: [arg('cor'), arg('tamanho')],
    kw_defaults: [null, integer('10')],
    kwarg: arg('opcoes'),
  })
  const ids = roundtrip(
    moduleNode([
      def('audio_importer', args([], { vararg: arg('path') })),
      def('desenhar', full),
      def('so_nomes', args([], { kwonlyargs: [arg('k')], kw_defaults: [null] })),
      expression(node('Lambda', { args: args([], { kwarg: arg('extras') }), body: none() })),
    ]),
  )
  expect(ids.filter((id) => id === 'sz_py_parameters_full')).toHaveLength(4)
  // A beginner's list keeps the beginner block.
  expect(roundtrip(moduleNode([def('somar', args(['a', 'b']))]))).not.toContain(
    'sz_py_parameters_full',
  )
})

test('a keyword-only default followed by a parameter without one stays as exact Python text', () => {
  // def f(*, a=1, b): the "last ones have defaults" reading would move the default.
  const original = moduleNode([
    def('f', args([], { kwonlyargs: [arg('a'), arg('b')], kw_defaults: [integer('1'), null] })),
  ])
  const projection = pythonASTToVisual(original)
  expect(opaque(projection.body)).toBe(1)
  expect(pythonSemanticTree(pythonVisualToAST(projection))).toEqual(pythonSemanticTree(original))
})

test('decorated functions and classes: @property, @x.setter, @staticmethod and decorator calls', () => {
  const ids = roundtrip(
    moduleNode([
      node('ClassDef', {
        name: 'Monstro',
        bases: [],
        keywords: [],
        body: [
          def('health', args(['self']), [name('property')]),
          def('health', args(['self', 'value']), [attribute(name('health'), 'setter')]),
          def('criar', args([]), [name('staticmethod')]),
          def('caro', args(['self']), [
            call(
              attribute(name('functools'), 'lru_cache'),
              [],
              [node('keyword', { arg: 'maxsize', value: none() })],
            ),
            name('classmethod'),
          ]),
        ],
        decorator_list: [name('dataclass')],
        type_params: [],
      }),
    ]),
  )
  expect(ids[0]).toBe('sz_py_decorated_class')
  expect(ids.filter((id) => id === 'sz_py_decorated_function')).toHaveLength(4)
})

test('match/case: values, alternatives, captures, sequences, mappings, classes and guards', () => {
  const ids = roundtrip(
    moduleNode([
      node('Match', {
        subject: attribute(name('self'), 'state'),
        cases: [
          caseOf(equalTo(text('general')), null, [
            expression(call(attribute(name('self'), 'quad_select'), [])),
          ]),
          caseOf(
            node('MatchOr', {
              patterns: [equalTo(integer('4')), equalTo(attribute(name('Cor'), 'OURO'))],
            }),
          ),
          caseOf(node('MatchSingleton', { value: null })),
          caseOf(
            node('MatchSequence', {
              patterns: [capture('x'), node('MatchStar', { name: 'resto' })],
            }),
            compare(name('x'), 'Gt', integer('0')),
          ),
          caseOf(node('MatchSequence', { patterns: [node('MatchStar', { name: null })] })),
          caseOf(
            node('MatchMapping', {
              keys: [text('tipo')],
              patterns: [equalTo(text('moeda'))],
              rest: 'outros',
            }),
          ),
          caseOf(
            node('MatchClass', {
              cls: name('Ponto'),
              patterns: [capture('a')],
              kwd_attrs: ['y'],
              kwd_patterns: [equalTo(integer('0'))],
            }),
          ),
          caseOf(
            capture('par', node('MatchSequence', { patterns: [capture(null), capture(null)] })),
          ),
          caseOf(capture(null), null, [assign('z', boolean())]),
        ],
      }),
    ]),
  )
  for (const id of NEW_IDS.filter((id) => id === 'sz_py_match' || id.startsWith('sz_py_case')))
    expect(ids, id).toContain(id)
})

test('match/case pieces only connect where Python accepts them', () => {
  registerPythonBlocks()
  const workspace = new Blockly.Workspace()
  try {
    const match = workspace.newBlock('sz_py_match')
    const caseBlock = workspace.newBlock('sz_py_case')
    const pattern = workspace.newBlock('sz_py_case_default')
    const variable = workspace.newBlock('sz_py_variable')
    const checker = workspace.connectionChecker
    const cases = match.getInput('cases:0')!.connection!
    const subject = match.getInput('subject')!.connection!
    const slot = caseBlock.getInput('pattern')!.connection!
    expect(checker.canConnect(cases, caseBlock.outputConnection, false)).toBe(true)
    expect(checker.canConnect(subject, caseBlock.outputConnection, false)).toBe(false)
    expect(checker.canConnect(slot, pattern.outputConnection, false)).toBe(true)
    expect(checker.canConnect(slot, variable.outputConnection, false)).toBe(false)
    expect(checker.canConnect(subject, pattern.outputConnection, false)).toBe(false)
  } finally {
    workspace.dispose()
  }
})

test('comprehensions with several for/if clauses, dict and set comprehensions and generators', () => {
  const pairs = node('ListComp', {
    elt: tuple(name('col'), name('row')),
    generators: [
      clause(name('col', 'Store'), call(name('range'), [name('n')])),
      clause(name('row', 'Store'), call(name('range'), [name('n')]), [
        compare(name('row'), 'Gt', integer('0')),
        compare(name('col'), 'NotEq', name('row')),
      ]),
    ],
  })
  const lookup = node('DictComp', {
    key: name('key'),
    value: node('Subscript', { value: name('value'), slice: text('type'), ctx: node('Load') }),
    generators: [
      clause(
        node('Tuple', { elts: [name('key', 'Store'), name('value', 'Store')], ctx: node('Store') }),
        call(attribute(name('EDITOR_DATA'), 'items'), []),
        [node('Subscript', { value: name('value'), slice: text('preview'), ctx: node('Load') })],
      ),
    ],
  })
  const ids = roundtrip(
    moduleNode([
      assign('casas', pairs),
      assign('tipos', lookup),
      assign(
        'unicos',
        node('SetComp', { elt: name('x'), generators: [clause(name('x', 'Store'), name('xs'))] }),
      ),
      assign(
        'total',
        call(name('sum'), [
          node('GeneratorExp', {
            elt: attribute(name('m'), 'valor'),
            generators: [clause(name('m', 'Store'), name('moedas'))],
          }),
        ]),
      ),
      // The one-for, one-if list keeps its simpler block.
      assign(
        'pares',
        node('ListComp', { elt: name('x'), generators: [clause(name('x', 'Store'), name('xs'))] }),
      ),
    ]),
  )
  for (const id of ['sz_py_list_built', 'sz_py_dict_built', 'sz_py_set_built', 'sz_py_generator'])
    expect(
      ids.filter((found) => found === id),
      id,
    ).toHaveLength(1)
  expect(ids).toContain('sz_py_list_comprehension')
  expect(ids.filter((id) => id === 'sz_py_comprehension_for')).toHaveLength(5)
})

test('bitwise operators: flags & SRCALPHA, a | b, ~x and |=', () => {
  const flags = (op: string, left: PythonNode, right: PythonNode) =>
    node('BinOp', { left, op: node(op), right })
  const ids = roundtrip(
    moduleNode([
      assign(
        'transparente',
        flags(
          'BitAnd',
          call(attribute(name('surf'), 'get_flags'), []),
          attribute(name('pygame'), 'SRCALPHA'),
        ),
      ),
      assign('juntas', flags('BitOr', name('a'), flags('LShift', integer('1'), integer('3')))),
      assign('sem', node('UnaryOp', { op: node('Invert'), operand: name('a') })),
      node('AugAssign', { target: name('a', 'Store'), op: node('BitXor'), value: integer('2') }),
    ]),
  )
  expect(ids.filter((id) => id === 'sz_py_bitwise')).toHaveLength(3)
  expect(ids).toContain('sz_py_invert')
  expect(ids).toContain('sz_py_update_bits')
  expect(ids).not.toContain('sz_py_arithmetic')
})

test(`data tables up to ${PYTHON_MAX_ITEMS} items stay blocks; one more stays exact Python text`, () => {
  const numbers = (size: number) => Array.from({ length: size }, (_, i) => integer(String(i)))
  const table = moduleNode([
    assign('nivel', node('List', { elts: numbers(PYTHON_MAX_ITEMS), ctx: node('Load') })),
    assign(
      'tiles',
      node('Dict', {
        keys: numbers(PYTHON_MAX_ITEMS).map((key) => text(`t${key.fields.value}`)),
        values: numbers(PYTHON_MAX_ITEMS),
      }),
    ),
    expression(call(name('print'), numbers(PYTHON_MAX_ITEMS))),
  ])
  const started = performance.now()
  const ids = roundtrip(table)
  // Linear work per socket: well under a second for three full tables on any machine.
  expect(performance.now() - started).toBeLessThan(5000)
  expect(ids).toContain('sz_py_list')
  expect(ids).toContain('sz_py_dictionary')
  const longer = moduleNode([
    assign('nivel', node('List', { elts: numbers(PYTHON_MAX_ITEMS + 1), ctx: node('Load') })),
  ])
  const projection = pythonASTToVisual(longer)
  expect(opaque(projection.body)).toBe(1)
  expect(pythonSemanticTree(pythonVisualToAST(projection))).toEqual(pythonSemanticTree(longer))
})

test('growing a class pattern or a mapping pattern in Blockly keeps a valid layout', () => {
  registerPythonBlocks()
  const workspace = new Blockly.Workspace()
  try {
    const pattern = workspace.newBlock('sz_py_case_class') as PythonBlocklyBlock
    pattern.setPythonOption('kwd:count', 2)
    pattern.setPythonOption('patterns:count', 1)
    expect(pattern.pythonState.layout.fields.map((field) => field.name)).toEqual([
      'kwd_attrs:0',
      'kwd_attrs:1',
    ])
    expect(pattern.pythonState.layout.inputs.map((input) => input.name).sort()).toEqual(
      ['cls', 'kwd_patterns:0', 'kwd_patterns:1', 'patterns:0'].sort(),
    )
    const mapping = workspace.newBlock('sz_py_case_mapping') as PythonBlocklyBlock
    mapping.setPythonOption('rest:present', true)
    mapping.setPythonOption('count', 2)
    expect(mapping.pythonState.layout.extra).toEqual({ count: 2, 'rest:present': true })
    for (const block of [pattern, mapping]) {
      const restored = Blockly.serialization.blocks.append(
        Blockly.serialization.blocks.save(block)!,
        workspace,
      ) as PythonBlocklyBlock
      expect(restored.pythonState.layout).toEqual(block.pythonState.layout)
    }
  } finally {
    workspace.dispose()
  }
})

test('the advanced codecs never claim simpler code that already has a block', () => {
  const simple = moduleNode([
    def('pular', args(['altura'])),
    assign('soma', node('BinOp', { left: integer('1'), op: node('Add'), right: integer('2') })),
  ])
  const ids = codecIds(pythonASTToVisual(simple).body)
  for (const id of NEW_IDS) expect(ids).not.toContain(id)
  expect(PYTHON_PROGRAMMING_CODECS.length).toBe(
    new Set(PYTHON_PROGRAMMING_CODECS.map((c) => c.id)).size,
  )
})

test('a case or except from the palette or from "Adicionar" is a real block that takes commands', () => {
  registerPythonBlocks()
  const workspace = new Blockly.Workspace()
  try {
    const accepts = (holder: Blockly.Block) => {
      const body = holder.getInput('body')!.connection!
      const command = workspace.newBlock('sz_py_pass')
      return workspace.connectionChecker.canConnect(body, command.previousConnection, false)
    }
    for (const id of ['sz_py_match', 'sz_py_try']) {
      const { kind: _kind, ...state } = pythonPaletteBlockState(
        PYTHON_PROGRAMMING_CODEC_BY_ID.get(id)!,
        PYTHON_PROGRAMMING_CODECS,
      )
      const block = Blockly.serialization.blocks.append(
        state as Blockly.serialization.blocks.State,
        workspace,
      )
      const pieces = block.getChildren(false).filter((child) => child.getInput('body'))
      expect(pieces.length, id).toBeGreaterThan(0)
      for (const piece of pieces) {
        expect(piece.isShadow(), id).toBe(false)
        expect(accepts(piece), id).toBe(true)
        // Its own pattern or error type is still a replaceable shadow.
        expect(
          piece.getChildren(false).some((child) => child.isShadow()),
          id,
        ).toBe(true)
      }
    }
    const match = workspace.newBlock('sz_py_match') as PythonBlocklyBlock
    match.setPythonOption('cases:count', 3)
    const added = match.getInputTargetBlock('cases:2')!
    expect(added.type).toBe('sz_py_case')
    expect(added.isShadow()).toBe(false)
    expect(accepts(added)).toBe(true)
  } finally {
    workspace.dispose()
  }
})
