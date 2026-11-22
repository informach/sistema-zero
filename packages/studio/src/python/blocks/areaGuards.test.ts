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
import { PYTHON_ORGANIZE_GROUPS } from './areaOrganize'
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
  const order = lines()
  const another = ws.newBlock('sz_py_assign')
  ws.getBlockById(order[1]!)!.nextConnection!.connect(another.previousConnection!)
  await tick()
  await tick()
  expect(lines()).toEqual([order[0]!, order[1]!, another.id, order[2]!, order[3]!])
  another.unplug(true)
  await tick()
  await tick()
  expect(JSON.stringify(program())).toBe(before)
})

test('uma linha solta embaixo da cauda sobe para antes do ligar o jogo', async () => {
  open([imp('pgzrun'), show(1), go, show(9)], ['libraries', 'start', 'start', 'start'])
  const order = lines()
  const another = ws.newBlock('sz_py_pass')
  ws.getBlockById(order[3]!)!.nextConnection!.connect(another.previousConnection!)
  await tick()
  await tick()
  expect(lines()).toEqual([order[0]!, order[1]!, another.id, order[2]!, order[3]!])
})

test('uma linha nova numa área depois do ligar o jogo leva o fim (com a cauda) para o fim', async () => {
  open([imp('pgzrun'), show(1), go, show(9)], ['libraries', 'start', 'start', 'start'])
  const [, one, goId, nine] = lines()
  // A criança põe uma linha nova no 🔁 (uma área depois do Ao iniciar).
  const frame = ensurePythonAreaFrame(ws, 'loops')
  const fresh = ws.newBlock('sz_py_pass')
  appendToPythonAreaFrame(frame, fresh)
  await tick()
  await tick()
  expect(lines()).toEqual([lines()[0]!, one!, fresh.id, goId!, nine!])
  expect(ws.getBlockById(goId!)!.getSurroundParent()).toBe(frame)
})

test('mexer numa linha antes do fim não troca o ligar o jogo com a cauda dele', async () => {
  open(
    [imp('pgzrun'), show(1), show(2), go, show(9)],
    ['libraries', 'start', 'start', 'start', 'start'],
  )
  const before = lines()
  // A criança tira o print(1) e o solta de volta antes do print(2).
  const one = ws.getBlockById(before[1]!)!
  one.unplug(true)
  pythonAreaFrames(ws)
    .get('start')!
    .getInput(PYTHON_AREA_INPUT)!
    .connection!.connect(one.previousConnection!)
  await tick()
  await tick()
  expect(lines()).toEqual(before)
})

test('o que cai embaixo da cauda volta para cima, e o resto religado fica com o fim', async () => {
  const exit = expression(call(attribute(name('sys'), 'exit')))
  open(
    [imp('pgzrun'), show(1), go, show(9), exit],
    ['libraries', 'start', 'start', 'start', 'start'],
  )
  const [lib, one, goId, nine, exitId] = lines()
  // Solta uma pilha nova entre o print(9) e o sys.exit() (o Blockly religa o sys.exit embaixo dela).
  const fresh = ws.newBlock('sz_py_pass')
  const nineBlock = ws.getBlockById(nine!)!
  Blockly.Events.setGroup(true)
  nineBlock.nextConnection!.connect(fresh.previousConnection!)
  Blockly.Events.setGroup(false)
  expect(fresh.getNextBlock()?.id).toBe(exitId)
  await tick()
  await tick()
  expect(lines()).toEqual([lib!, one!, fresh.id, goId!, nine!, exitId!])
})

test('o organizar não passa pela guarda do fim do jogo', async () => {
  open([imp('pgzrun'), show(1), go, show(9)], ['libraries', 'start', 'start', 'start'])
  const before = lines()
  Blockly.Events.setGroup(true)
  PYTHON_ORGANIZE_GROUPS.add(Blockly.Events.getGroup())
  // Um religar do organizar que deixa o print(9) fora da cauda (o plano manda nele).
  const nine = ws.getBlockById(before[3]!)!
  const frame = ensurePythonAreaFrame(ws, 'loops')
  nine.unplug(false)
  appendToPythonAreaFrame(frame, nine)
  Blockly.Events.setGroup(false)
  await tick()
  await tick()
  expect(lines()).toEqual(before)
  expect(nine.getSurroundParent()).toBe(frame)
})

test('o "guardar" que entra em Configurações com nome minúsculo ganha MAIÚSCULAS', async () => {
  open([expression(call(name('print'), [integer('1')]))], ['start'])
  Blockly.Events.disable()
  let stack: Blockly.Block
  try {
    pythonVisualToWorkspace(
      pythonASTToVisual(
        moduleNode([
          node('Assign', {
            targets: [name('vidas', 'Store')],
            value: integer('3'),
            type_comment: null,
          }),
        ]),
      ),
      ws,
    )
    stack = ws.getTopBlocks(false).find((block) => block.type === 'sz_py_assign')!
  } finally {
    Blockly.Events.enable()
  }
  appendToPythonAreaFrame(ensurePythonAreaFrame(ws, 'settings'), stack)
  await tick()
  await tick()
  expect(String(stack.getInputTargetBlock('TARGET')!.getFieldValue('NAME'))).toBe('VIDAS')
  // Trocar o nome dentro de Configurações: ao terminar de digitar, MAIÚSCULAS de novo.
  stack.getInputTargetBlock('TARGET')!.setFieldValue('tempo', 'NAME')
  await tick()
  await tick()
  expect(String(stack.getInputTargetBlock('TARGET')!.getFieldValue('NAME'))).toBe('TEMPO')
})

test('o nome que já existe em MAIÚSCULAS não é trocado (não junta duas variáveis)', async () => {
  const assign = (id: string, value: string) =>
    node('Assign', { targets: [name(id, 'Store')], value: integer(value), type_comment: null })
  // `VIDAS = 3` já está em Configurações; a criança digita `vidas` em outro "guardar" ali.
  open([assign('VIDAS', '3')], ['settings'])
  Blockly.Events.disable()
  let stack: Blockly.Block
  try {
    pythonVisualToWorkspace(pythonASTToVisual(moduleNode([assign('tempo', '9')])), ws)
    stack = ws
      .getTopBlocks(false)
      .find(
        (block) =>
          block.type === 'sz_py_assign' &&
          String(block.getInputTargetBlock('TARGET')!.getFieldValue('NAME')) === 'tempo',
      )!
  } finally {
    Blockly.Events.enable()
  }
  appendToPythonAreaFrame(pythonAreaFrames(ws).get('settings')!, stack)
  await tick()
  await tick()
  expect(String(stack.getInputTargetBlock('TARGET')!.getFieldValue('NAME'))).toBe('TEMPO')
  stack.getInputTargetBlock('TARGET')!.setFieldValue('vidas', 'NAME')
  await tick()
  await tick()
  expect(String(stack.getInputTargetBlock('TARGET')!.getFieldValue('NAME'))).toBe('vidas')
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
