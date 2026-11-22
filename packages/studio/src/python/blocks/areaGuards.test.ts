import { afterEach, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { PythonNode } from '../language/types'
import { setPythonAreaRules } from './areaConnectionChecker'
import {
  appendToPythonAreaFrame,
  ensurePythonAreaFrame,
  executablePythonAreaFrames,
  PYTHON_AREA_INPUT,
  pythonAreaFrames,
  pythonScratchRoots,
} from './areaFrames'
import { attachPythonAreaGuards } from './areaGuards'
import type { PythonAreaKind } from './areas'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { attribute, call, expression, integer, moduleNode, name, node } from './nodes'
import { pythonASTToVisual, pythonVisualToAST } from './projection'

const show = (value: number) => expression(call(name('print'), [integer(String(value))]))
const go = expression(call(attribute(name('pgzrun'), 'go')))
const imp = (id: string) => node('Import', { names: [node('alias', { name: id, asname: null })] })
const tick = () => new Promise((done) => setTimeout(done, 0))

let ws: Blockly.Workspace
let detach: () => void = () => {}
afterEach(() => {
  detach()
  ws?.dispose()
})

function open(statements: PythonNode[], areas: PythonAreaKind[]) {
  ws = new Blockly.Workspace()
  // Como a carga do editor: sem eventos (a guarda só olha gestos).
  Blockly.Events.disable()
  try {
    pythonVisualToWorkspace(pythonASTToVisual(moduleNode(statements)), ws, undefined, { areas })
  } finally {
    Blockly.Events.enable()
  }
  setPythonAreaRules(ws)
  detach = attachPythonAreaGuards(ws)
}
const lines = () =>
  executablePythonAreaFrames(ws).flatMap((frame) => {
    const out: string[] = []
    for (
      let block = frame.getInputTargetBlock(PYTHON_AREA_INPUT);
      block;
      block = block.getNextBlock()
    )
      out.push(block.id)
    return out
  })
const program = () =>
  pythonVisualToAST(
    pythonWorkspaceToVisual(
      ws,
      executablePythonAreaFrames(ws).map((frame) => frame.id),
    ),
  )

test('uma área repetida some e o que estava dentro dela vira rascunho', async () => {
  open([show(1)], ['start'])
  const copy = ws.newBlock('sz_py_area_start')
  const inside = ws.newBlock('sz_py_assign')
  appendToPythonAreaFrame(copy, inside)
  await tick()
  await tick()
  expect(ws.getBlocksByType('sz_py_area_start', false)).toHaveLength(1)
  expect(pythonScratchRoots(ws).map((block) => block.id)).toContain(inside.id)
})

test('o bloco que liga o jogo, solto no meio, volta para o fim da última área', async () => {
  open([imp('pgzrun'), show(1), show(2), go], ['libraries', 'start', 'start', 'start'])
  const goBlock = ws.getBlockById(lines().at(-1)!)!
  const first = ws.getBlockById(lines()[1]!)!
  // A criança arrasta o "ligar o jogo" para logo depois do primeiro print.
  goBlock.unplug(true)
  first.nextConnection!.connect(goBlock.previousConnection!)
  await tick()
  await tick()
  expect(lines().at(-1)).toBe(goBlock.id)
  expect(goBlock.getSurroundParent()).toBe(pythonAreaFrames(ws).get('start')!)
})

test('o conserto entra no mesmo passo de desfazer do gesto', async () => {
  open([imp('pgzrun'), show(1), show(2), go], ['libraries', 'start', 'start', 'start'])
  const before = JSON.stringify(program())
  const goBlock = ws.getBlockById(lines().at(-1)!)!
  const first = ws.getBlockById(lines()[1]!)!
  Blockly.Events.setGroup(true)
  goBlock.unplug(true)
  first.nextConnection!.connect(goBlock.previousConnection!)
  Blockly.Events.setGroup(false)
  await tick()
  await tick()
  expect(JSON.stringify(program())).toBe(before)
  await tick()
  ws.undo(false)
  await tick()
  expect(JSON.stringify(program())).toBe(before)
  expect(lines().at(-1)).toBe(goBlock.id)
})

test('editar outra linha não mexe num programa que já vinha com algo depois do ligar o jogo', async () => {
  // `print('obrigado')` depois do `pgzrun.go()` roda quando o jogo fecha: é a intenção da criança.
  open([imp('pgzrun'), show(1), go, show(9)], ['libraries', 'start', 'start', 'start'])
  const before = JSON.stringify(program())
  const another = ws.newBlock('sz_py_assign')
  const last = ws.getBlockById(lines().at(-1)!)!
  last.nextConnection!.connect(another.previousConnection!)
  await tick()
  await tick()
  another.unplug(false)
  await tick()
  expect(JSON.stringify(program())).toBe(before)
})

test('a guarda ignora a carga (blocos criados sem evento)', async () => {
  open([show(1)], ['start'])
  Blockly.Events.disable()
  try {
    ensurePythonAreaFrame(ws, 'events')
  } finally {
    Blockly.Events.enable()
  }
  await tick()
  Blockly.Events.disable()
  try {
    ws.newBlock('sz_py_area_events')
  } finally {
    Blockly.Events.enable()
  }
  await tick()
  // Sem evento, nada para consertar: as duas áreas de evento ficam até o próximo gesto.
  expect(ws.getBlocksByType('sz_py_area_events', false)).toHaveLength(2)
})
