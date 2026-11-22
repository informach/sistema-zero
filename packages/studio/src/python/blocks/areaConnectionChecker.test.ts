import { afterEach, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { PythonNode } from '../language/types'
import { pythonAreaDropAllowed, setPythonAreaRules } from './areaConnectionChecker'
import { ensurePythonAreaFrame, PYTHON_AREA_INPUT, pythonAreaFrames } from './areaFrames'
import type { PythonAreaKind } from './areas'
import { pythonBlockStatement, pythonVisualToWorkspace } from './blockly'
import { attribute, call, expression, integer, moduleNode, name, node, pass } from './nodes'
import { pythonASTToVisual } from './projection'

const assign = (target: string, value: PythonNode = integer('1')) =>
  node('Assign', { targets: [name(target, 'Store')], value, type_comment: null })
const imp = (id: string) => node('Import', { names: [node('alias', { name: id, asname: null })] })
const def = (id: string, body: PythonNode[] = [pass()]) =>
  node('FunctionDef', {
    name: id,
    args: node('arguments', {
      posonlyargs: [],
      args: [],
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
const show = (value: PythonNode) => expression(call(name('print'), [value]))
const mainloop = expression(call(attribute(name('turtle'), 'mainloop')))

let ws: Blockly.Workspace
afterEach(() => ws?.dispose())

function open(statements: PythonNode[], areas: PythonAreaKind[]) {
  ws = new Blockly.Workspace()
  pythonVisualToWorkspace(pythonASTToVisual(moduleNode(statements)), ws, undefined, { areas })
  setPythonAreaRules(ws)
  return pythonAreaFrames(ws)
}
/** Um bloco solto (rascunho), feito do código. */
function loose(statement: PythonNode) {
  const before = new Set(ws.getAllBlocks(false).map((block) => block.id))
  pythonVisualToWorkspace(pythonASTToVisual(moduleNode([statement])), ws)
  return ws.getTopBlocks(false).find((block) => !before.has(block.id))!
}
const areaInput = (kind: PythonAreaKind) =>
  ensurePythonAreaFrame(ws, kind).getInput(PYTHON_AREA_INPUT)!.connection!
const drop = (block: Blockly.Block, target: Blockly.Connection) =>
  pythonAreaDropAllowed(block.previousConnection!, target)

test('cada área especial aceita só os blocos dela; o Ao iniciar aceita qualquer um', () => {
  open(
    [imp('random'), assign('VEL', integer('2')), show(integer('1'))],
    ['libraries', 'settings', 'start'],
  )
  const definition = loose(def('pular'))
  const importBlock = loose(imp('math'))
  expect(drop(definition, areaInput('settings'))).toBe(false)
  expect(drop(definition, areaInput('libraries'))).toBe(false)
  expect(drop(definition, areaInput('molds'))).toBe(true)
  expect(drop(definition, areaInput('start'))).toBe(true)
  expect(drop(importBlock, areaInput('libraries'))).toBe(true)
  expect(drop(importBlock, areaInput('molds'))).toBe(false)
  // Embaixo do último bloco de uma área vale a regra da área.
  const vel = pythonAreaFrames(ws).get('settings')!.getInputTargetBlock(PYTHON_AREA_INPUT)!
  expect(drop(definition, vel.nextConnection!)).toBe(false)
  expect(drop(loose(assign('ALTURA', integer('3'))), vel.nextConnection!)).toBe(true)
})

test('"guardar" com nome minúsculo e valor fixo cabe em Configurações; com valor que muda, não', () => {
  open([show(integer('1'))], ['start'])
  expect(drop(loose(assign('vidas', integer('3'))), areaInput('settings'))).toBe(true)
  expect(drop(loose(assign('vidas', call(name('input')))), areaInput('settings'))).toBe(false)
})

test('a pilha inteira precisa caber, não só o primeiro bloco', () => {
  open([show(integer('1'))], ['start'])
  const first = loose(imp('math'))
  const second = loose(def('pular'))
  first.nextConnection!.connect(second.previousConnection!)
  expect(drop(first, areaInput('libraries'))).toBe(false)
  expect(drop(first, areaInput('start'))).toBe(true)
})

test('dentro de uma função, de um evento ou de um laço cabe qualquer comando', () => {
  open([def('pular', [show(integer('1'))])], ['molds'])
  const definition = pythonAreaFrames(ws).get('molds')!.getInputTargetBlock(PYTHON_AREA_INPUT)!
  const inner = definition.getInputTargetBlock('body')!
  expect(drop(loose(imp('math')), inner.nextConnection!)).toBe(true)
})

test('nada encaixa embaixo do bloco que liga ou desliga o jogo', () => {
  open([imp('turtle'), show(integer('1')), mainloop], ['libraries', 'start', 'start'])
  const start = pythonAreaFrames(ws).get('start')!.getInputTargetBlock(PYTHON_AREA_INPUT)!
  const last = start.getNextBlock()!
  expect(pythonBlockStatement(last)?.kind).toBe('Expr')
  const another = loose(show(integer('2')))
  expect(drop(another, last.nextConnection!)).toBe(false)
  expect(drop(another, start.nextConnection!)).toBe(true)
})

test('rascunho e workspace sem a regra ligada aceitam tudo', () => {
  open([show(integer('1'))], ['start'])
  const free = loose(show(integer('2')))
  expect(drop(loose(imp('math')), free.nextConnection!)).toBe(true)
  const other = new Blockly.Workspace()
  try {
    pythonVisualToWorkspace(pythonASTToVisual(moduleNode([show(integer('1'))])), other, undefined, {
      areas: ['start'],
    })
    const frame = pythonAreaFrames(other).get('start')!
    const block = other.newBlock('sz_py_def')
    expect(
      pythonAreaDropAllowed(
        block.previousConnection!,
        frame.getInput(PYTHON_AREA_INPUT)!.connection!,
      ),
    ).toBe(true)
  } finally {
    other.dispose()
  }
})
