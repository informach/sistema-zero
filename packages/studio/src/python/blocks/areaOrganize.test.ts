import { afterEach, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { PythonNode } from '../language/types'
import { setPythonAreaRules } from './areaConnectionChecker'
import { executablePythonAreaFrames, PYTHON_AREA_INPUT, pythonAreaKindOf } from './areaFrames'
import {
  appendBeforePythonGameSwitch,
  applyPythonAreaNotes,
  organizePythonWorkspace,
  PYTHON_AREA_WARNING_ID,
  pythonAreaNoteText,
  pythonWantedArea,
} from './areaOrganize'
import type { PythonAreaKind } from './areas'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { PYTHON_PROGRAMMING_CODECS as codecs } from './catalog'
import { attribute, call, expression, integer, moduleNode, name, node, pass, text } from './nodes'
import { pythonASTToVisual, pythonVisualToAST } from './projection'

const show = (value: number) => expression(call(name('print'), [integer(String(value))]))
const assign = (target: string, value: PythonNode) =>
  node('Assign', { targets: [name(target, 'Store')], value, type_comment: null })
const def = (id: string) =>
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
    body: [pass()],
    decorator_list: [],
    returns: null,
    type_comment: null,
    type_params: [],
  })
const cls = (id: string, body: PythonNode[]) =>
  node('ClassDef', { name: id, bases: [], keywords: [], body, decorator_list: [], type_params: [] })
const go = expression(call(attribute(name('pgzrun'), 'go')))
const tick = () => new Promise((done) => setTimeout(done, 0))

let ws: Blockly.Workspace
afterEach(() => ws?.dispose())

function open(statements: PythonNode[], areas: PythonAreaKind[]) {
  ws = new Blockly.Workspace()
  Blockly.Events.disable()
  try {
    pythonVisualToWorkspace(pythonASTToVisual(moduleNode(statements)), ws, codecs, { areas })
  } finally {
    Blockly.Events.enable()
  }
  setPythonAreaRules(ws, codecs)
}
const program = () =>
  JSON.stringify(
    pythonVisualToAST(
      pythonWorkspaceToVisual(
        ws,
        executablePythonAreaFrames(ws).map((frame) => frame.id),
      ),
    ),
  )
const layout = () =>
  executablePythonAreaFrames(ws).map((frame) => {
    const types: string[] = []
    for (
      let block = frame.getInputTargetBlock(PYTHON_AREA_INPUT);
      block;
      block = block.getNextBlock()
    )
      types.push(block.type)
    return [pythonAreaKindOf(frame), types]
  })

test('organizar leva cada linha para a área dela, e o desfazer volta num passo só', async () => {
  // Tudo no Ao iniciar (como um arquivo que veio da Ponte): a função sobe para Meus moldes.
  open([show(1), def('pular'), show(2)], ['start', 'start', 'start'])
  const before = program()
  const result = organizePythonWorkspace(ws, codecs)
  expect(result.changed).toBe(true)
  expect(layout()).toEqual([
    ['molds', ['sz_py_def']],
    ['start', ['sz_py_print', 'sz_py_print']],
  ])
  // Mesma coisa, outra ordem: a função subiu para antes dos prints.
  expect(program()).not.toBe(before)
  await tick()
  ws.undo(false)
  await tick()
  expect(program()).toBe(before)
  expect(organizePythonWorkspace(ws, codecs, { apply: false }).changed).toBe(false)
})

test('organizar o que já está arrumado não mexe em nada', () => {
  open([def('pular'), show(1)], ['molds', 'start'])
  expect(organizePythonWorkspace(ws, codecs)).toEqual({ changed: false, notes: [] })
})

test('a linha que não pode ir para a área dela fica, com a nota explicando por quê', () => {
  // A classe usa `largura` logo que é criada: não pode subir para antes de `largura = …`.
  open(
    [assign('largura', call(name('input'))), cls('Nave', [assign('x', name('largura'))])],
    ['start', 'start'],
  )
  const result = organizePythonWorkspace(ws, codecs)
  expect(result.changed).toBe(false)
  expect(result.notes).toHaveLength(1)
  const [note] = result.notes
  expect(note!.wanted).toBe('molds')
  expect(note!.conflict).toEqual({ reason: 'name', name: 'largura' })
  expect(pythonAreaNoteText(note!)).toContain('"largura"')
  applyPythonAreaNotes(ws, result.notes)
  expect(pythonWantedArea(note!.block)).toBe('molds')
  applyPythonAreaNotes(ws, [])
  expect(pythonWantedArea(note!.block)).toBeUndefined()
})

test('programa incompleto (entrada vazia) não é organizado', () => {
  open([show(1)], ['start'])
  const frame = executablePythonAreaFrames(ws)[0]!
  const empty = ws.newBlock('sz_py_print')
  frame.getInputTargetBlock(PYTHON_AREA_INPUT)!.nextConnection!.connect(empty.previousConnection!)
  expect(organizePythonWorkspace(ws, codecs)).toEqual({ changed: false, notes: [] })
})

test('a linha presa na fonte não sai do lugar e a nota diz por quê', () => {
  open([show(1), def('pular')], ['start', 'start'])
  const definition = ws.getBlocksByType('sz_py_def', false)[0]!
  const result = organizePythonWorkspace(ws, codecs, { movable: (block) => block !== definition })
  expect(result.changed).toBe(false)
  expect(result.notes.map((note) => note.conflict)).toEqual([{ reason: 'fixed' }])
})

test('o que entra no fim de uma área fica antes do bloco que liga o jogo', () => {
  open(
    [node('Import', { names: [node('alias', { name: 'pgzrun', asname: null })] }), show(1), go],
    ['libraries', 'start', 'start'],
  )
  const start = executablePythonAreaFrames(ws).at(-1)!
  const extra = ws.newBlock('sz_py_pass')
  appendBeforePythonGameSwitch(start, extra)
  expect(layout().at(-1)).toEqual(['start', ['sz_py_print', 'sz_py_pass', 'sz_py_method']])
  expect(text('x').kind).toBe('Constant')
})

test('o aviso usa um id próprio e não apaga outros avisos do bloco', () => {
  open(
    [assign('largura', call(name('input'))), cls('Nave', [assign('x', name('largura'))])],
    ['start', 'start'],
  )
  const { notes } = organizePythonWorkspace(ws, codecs, { apply: false })
  const block = notes[0]!.block
  expect(PYTHON_AREA_WARNING_ID).toBe('python-area')
  expect(() => applyPythonAreaNotes(ws, notes)).not.toThrow()
  expect(() => block.setWarningText(null, 'outro')).not.toThrow()
})
