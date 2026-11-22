import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { analyzePythonModuleAreas, pythonDisplayAreas } from '../../blocks/areas'
import {
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
  registerPythonBlocks,
} from '../../blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../../blocks/catalog'
import {
  attribute,
  call,
  expression,
  integer,
  moduleNode,
  name,
  node,
  pass,
  pythonSemanticTree,
} from '../../blocks/nodes'
import {
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../blocks/projection'
import { attachPythonResolverOptions } from '../../blocks/resolverOptions'
import type { PythonNode } from '../../language/types'
import { PYTHON_TURTLE_CODECS, TURTLE_STAR_EXPORTS } from './catalog'

const codecs = attachPythonResolverOptions(
  [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS],
  { starExports: new Map([['turtle', TURTLE_STAR_EXPORTS]]) },
)
const official = { codecs, officialModules: new Set(['turtle']) }
const args = (params: string[] = []) =>
  node('arguments', {
    posonlyargs: [],
    args: params.map((arg) => node('arg', { arg, annotation: null, type_comment: null })),
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  })
const def = (id: string, body: PythonNode[], params: string[] = []) =>
  node('FunctionDef', {
    name: id,
    args: args(params),
    body,
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
const assign = (id: string, value: PythonNode) =>
  node('Assign', { targets: [name(id, 'Store')], value, type_comment: null })
const importTurtle = node('Import', { names: [node('alias', { name: 'turtle', asname: null })] })
const screen = assign('tela', call(attribute(name('turtle'), 'Screen')))
const pen = assign('t', call(attribute(name('turtle'), 'Turtle')))
const ontimer = (receiver: string | null, scheduled: string, ms: PythonNode = integer('30')) =>
  expression(
    call(receiver ? attribute(name(receiver), 'ontimer') : name('ontimer'), [name(scheduled), ms]),
  )
const step = expression(call(attribute(name('t'), 'forward'), [integer('2')]))
const firstTurn = expression(call(name('a_cada_quadro')))

const top = (module: PythonNode) => pythonASTToVisual(module, official).body
const codecOf = (value: PythonVisualNode | undefined) =>
  value?.kind === 'block' ? value.codecId : 'source'

function roundTrip(module: PythonNode) {
  registerPythonBlocks(codecs)
  const projection = pythonASTToVisual(module, official)
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(projection, workspace, codecs)
    const saved = Blockly.serialization.workspaces.save(workspace)
    workspace.clear()
    Blockly.serialization.workspaces.load(saved, workspace)
    const restored = pythonVisualToAST(
      pythonWorkspaceToVisual(workspace, roots, [], codecs),
      codecs,
    )
    expect(pythonSemanticTree(restored)).toEqual(pythonSemanticTree(module))
  } finally {
    workspace.dispose()
  }
}

test('a função que se reagenda com a tela do Turtle vira o bloco "repetir a cada", sem perder nada', () => {
  const module = moduleNode([
    importTurtle,
    screen,
    pen,
    def('a_cada_quadro', [step, ontimer('tela', 'a_cada_quadro')]),
    firstTurn,
    expression(call(attribute(name('tela'), 'mainloop'))),
  ])
  const body = top(module)
  expect(codecOf(body[3])).toBe('sz_py_turtle_every')
  const block = body[3] as Extract<PythonVisualNode, { kind: 'block' }>
  expect(block.fields).toEqual([{ name: 'NAME', label: '', value: 'a_cada_quadro' }])
  expect(block.inputs.map((input) => [input.name, input.nodes.map(codecOf)])).toEqual([
    ['ms', ['sz_py_integer']],
    ['body', ['sz_py_turtle_turtle_forward']],
  ])
  roundTrip(module)
})

test('vale com o módulo (turtle.ontimer) e com o ontimer de "from turtle import *"', () => {
  const viaModule = moduleNode([
    importTurtle,
    def('passo', [ontimer('turtle', 'passo', integer('50'))]),
  ])
  expect(codecOf(top(viaModule)[1])).toBe('sz_py_turtle_every')
  roundTrip(viaModule)
  const star = moduleNode([
    node('ImportFrom', {
      module: 'turtle',
      names: [node('alias', { name: '*', asname: null })],
      level: { literal: 'int', value: '0' },
    }),
    def('passo', [pass(), ontimer(null, 'passo')]),
  ])
  expect(codecOf(top(star)[1])).toBe('sz_py_turtle_every')
  roundTrip(star)
})

test('fica no "definir a função" quando não é o laço do Turtle', () => {
  const relogio = node('ClassDef', {
    name: 'Relogio',
    bases: [],
    keywords: [],
    body: [def('ontimer', [pass()], ['self', 'f', 'ms'])],
    decorator_list: [],
    type_params: [],
  })
  const cases: PythonNode[] = [
    // Agenda OUTRA função.
    moduleNode([importTurtle, screen, def('a', [ontimer('tela', 'b')])]),
    // Tem parâmetro.
    moduleNode([importTurtle, screen, def('a', [ontimer('tela', 'a')], ['x'])]),
    // O ontimer não é o último comando.
    moduleNode([importTurtle, screen, def('a', [ontimer('tela', 'a'), step])]),
    // A "tela" é um objeto da própria criança.
    moduleNode([relogio, assign('r', call(name('Relogio'))), def('a', [ontimer('r', 'a')])]),
  ]
  for (const module of cases) {
    const body = top(module)
    expect(codecOf(body.at(-1))).toBe('sz_py_def')
  }
})

test('trocar o nome no bloco troca a função e o reagendamento juntos', () => {
  const codec = PYTHON_TURTLE_CODECS.find((item) => item.id === 'sz_py_turtle_every')!
  const shape = codec.decode(def('a_cada_quadro', [step, ontimer('tela', 'a_cada_quadro')]))!
  const renamed = codec.encode({
    ...shape,
    fields: [{ name: 'NAME', label: '', value: 'passo' }],
  })
  expect(pythonSemanticTree(renamed)).toEqual(
    pythonSemanticTree(def('passo', [step, ontimer('tela', 'passo')])),
  )
  expect(() =>
    codec.encode({ ...shape, fields: [{ name: 'NAME', label: '', value: '1x' }] }),
  ).toThrow()
})

test('o bloco mostra "milissegundos" logo depois do tempo, antes dos comandos', () => {
  registerPythonBlocks(codecs)
  const workspace = new Blockly.Workspace()
  try {
    const block = workspace.newBlock('sz_py_turtle_every')
    const names = block.inputList.map((input) => input.name)
    expect(names).toEqual(['HEADER', 'ms', 'SUFFIX:ms', 'body'])
    expect(block.getInput('SUFFIX:ms')!.fieldRow.map((field) => field.getText())).toEqual([
      'milissegundos',
    ])
  } finally {
    workspace.dispose()
  }
})

test('nas áreas: o bloco e a primeira volta ficam em "Enquanto estiver rodando"', () => {
  const module = moduleNode([
    importTurtle,
    screen,
    pen,
    def('a_cada_quadro', [step, ontimer('tela', 'a_cada_quadro')]),
    firstTurn,
    expression(call(attribute(name('tela'), 'mainloop'))),
  ])
  const projection = pythonASTToVisual(module, official)
  const analysis = analyzePythonModuleAreas(
    module,
    projection.body.map((value) => (value.kind === 'block' ? value.codecId : undefined)),
  )
  expect(pythonDisplayAreas(analysis.statements)).toEqual([
    'libraries',
    'start',
    'start',
    'loops',
    'loops',
    'loops',
  ])
})
