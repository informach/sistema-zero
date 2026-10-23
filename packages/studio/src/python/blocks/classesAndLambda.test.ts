import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual, registerPythonBlocks } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import {
  attribute,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  pythonSemanticTree,
  text,
} from './nodes'
import { type PythonVisualNode, pythonASTToVisual, pythonVisualToAST } from './projection'

const arg = (id: string) => node('arg', { arg: id, annotation: null, type_comment: null })
const args = (names: string[], defaults: ReturnType<typeof node>[] = [], extra = {}) =>
  node('arguments', {
    posonlyargs: [],
    args: names.map(arg),
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults,
    ...extra,
  })
const lambda = (parameters: ReturnType<typeof node>, body: ReturnType<typeof node>) =>
  node('Lambda', { args: parameters, body })
const classDef = (id: string, bases: ReturnType<typeof node>[], keywords = []) =>
  node('ClassDef', {
    name: id,
    bases,
    keywords,
    body: [
      node('FunctionDef', {
        name: '__init__',
        args: args(['self']),
        body: [expression(call(attribute(call(name('super')), '__init__')))],
        decorator_list: [],
        returns: null,
        type_comment: null,
        type_params: [],
      }),
    ],
    decorator_list: [],
    type_params: [],
  })
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
/** Projection, real Blockly save/load and the way back must keep the exact AST. */
function roundtrip(original: ReturnType<typeof moduleNode>) {
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

test('classes inherit from names and attributes, and super().__init__() stays visual', () => {
  const ids = roundtrip(
    moduleNode([
      classDef('Alvo', []),
      classDef('Morcego', [name('Alvo')]),
      classDef('Ator', [attribute(name('turtle'), 'Turtle')]),
      classDef('Misto', [name('Alvo'), name('Ator')]),
    ]),
  )
  expect(ids.filter((id) => id === 'sz_py_class')).toHaveLength(4)
})

test('class keywords and decorators still have no visual form', () => {
  const withKeyword = classDef('Alvo', [name('Base')])
  withKeyword.fields.keywords = [node('keyword', { arg: 'metaclass', value: name('Meta') })]
  const decorated = classDef('Alvo', [])
  decorated.fields.decorator_list = [name('dataclass')]
  for (const value of [withKeyword, decorated])
    expect(pythonASTToVisual(moduleNode([value])).body[0]!.kind).toBe('source')
})

test('lambda keeps parameters, defaults and the callback body through Blockly', () => {
  const ids = roundtrip(
    moduleNode([
      expression(
        call(attribute(name('tela'), 'onkey'), [
          lambda(args([]), call(name('virar'), [integer('90')])),
          text('Up'),
        ]),
      ),
      node('Assign', {
        targets: [name('dobro', 'Store')],
        value: lambda(
          args(['d'], [name('d')]),
          node('BinOp', {
            left: name('d'),
            op: node('Mult'),
            right: integer('2'),
          }),
        ),
        type_comment: null,
      }),
    ]),
  )
  expect(ids.filter((id) => id === 'sz_py_lambda')).toHaveLength(2)
})

test('lambda with *args, keyword-only or positional-only parameters keeps them as explicit source', () => {
  for (const parameters of [
    args([], [], { vararg: arg('a') }),
    args([], [], { kwonlyargs: [arg('k')], kw_defaults: [null] }),
    args([], [], { posonlyargs: [arg('a')] }),
  ]) {
    const original = moduleNode([expression(lambda(parameters, integer('0')))])
    const projection = pythonASTToVisual(original)
    // Same contract as def: the parameter list is never presented as understood.
    expect(opaque(projection.body)).toBe(1)
    expect(codecIds(projection.body)).not.toContain('sz_py_parameters')
    expect(pythonSemanticTree(pythonVisualToAST(projection))).toEqual(pythonSemanticTree(original))
  }
})

test('a lambda parameter that shadows turtle keeps the generic call', () => {
  const projection = pythonASTToVisual(
    moduleNode([
      node('Import', { names: [node('alias', { name: 'turtle', asname: null })] }),
      expression(
        lambda(args(['turtle']), call(attribute(name('turtle'), 'forward'), [integer('1')])),
      ),
    ]),
    { codecs: PYTHON_PROGRAMMING_CODECS, officialModules: new Set(['turtle']) },
  )
  expect(opaque(projection.body)).toBe(0)
  expect(codecIds(projection.body)).toContain('sz_py_call')
})
