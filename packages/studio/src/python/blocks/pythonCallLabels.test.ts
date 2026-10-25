import { afterEach, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { PythonNode } from '../language/types'
import { pythonVisualToWorkspace } from './blockly'
import { PYTHON_PROGRAMMING_CODECS as codecs } from './catalog'
import { call, integer, moduleNode, name, node, pass } from './nodes'
import { pythonASTToVisual } from './projection'
import { attachPythonCallLabels, refreshPythonCallLabels } from './pythonCallLabels'

const def = (fnName: string, params: string[], body: PythonNode[] = [pass()]) =>
  node('FunctionDef', {
    name: fnName,
    args: node('arguments', {
      posonlyargs: [],
      args: params.map((arg) => node('arg', { arg, annotation: null, type_comment: null })),
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
const run = (fnName: string, count: number) =>
  node('Expr', {
    value: call(
      name(fnName),
      Array.from({ length: count }, (_, index) => integer(String(index))),
    ),
  })

let workspace: Blockly.Workspace
afterEach(() => workspace?.dispose())

function open(body: PythonNode[]) {
  workspace = new Blockly.Workspace()
  pythonVisualToWorkspace(
    pythonASTToVisual(moduleNode(body), { codecs, officialModules: new Set() }),
    workspace,
    codecs,
  )
  return workspace
}
const labels = () =>
  workspace
    .getBlocksByType('sz_py_run', true)
    .map((block) =>
      block.inputList
        .filter((input) => input.name.startsWith('args:'))
        .map((input) => input.fieldRow.map((field) => field.getText()).join('')),
    )
const settle = () => new Promise((done) => setTimeout(done, 20))
const definition = () => workspace.getBlocksByType('sz_py_def', true)[0]!

test('the real block shows the name of each parameter, not only the projection', () => {
  open([def('mover', ['distancia', 'angulo']), run('mover', 3), run('outra', 1)])
  // Blockly rebuilds the layout of a saved block: before the refresh, the plain labels.
  expect(labels()).toEqual([['com', ',', ','], ['com']])
  refreshPythonCallLabels(workspace)
  expect(labels()).toEqual([['com distancia', ', angulo', ','], ['com']])
})

test('the labels follow the definition while the child renames it', async () => {
  open([def('mover', ['distancia', 'angulo']), run('mover', 2)])
  const detach = attachPythonCallLabels(workspace)
  expect(labels()).toEqual([['com distancia', ', angulo']])
  definition().setFieldValue('passos, giro', 'PARAMS')
  await settle()
  expect(labels()).toEqual([['com passos', ', giro']])
  // Renaming the function: the call no longer reaches it.
  definition().setFieldValue('andar', 'NAME')
  await settle()
  expect(labels()).toEqual([['com', ',']])
  // Choosing the new name on the call brings the names back.
  workspace.getBlocksByType('sz_py_run', true)[0]!.setFieldValue('andar', 'NAME')
  await settle()
  expect(labels()).toEqual([['com passos', ', giro']])
  detach()
})

test('a function defined twice, inside another one or with parameters being typed has no names', async () => {
  open([def('mover', ['a']), def('mover', ['b']), run('mover', 1)])
  refreshPythonCallLabels(workspace)
  expect(labels()).toEqual([['com']])
  open([def('fora', [], [def('mover', ['a'])]), run('mover', 1)])
  refreshPythonCallLabels(workspace)
  expect(labels()).toEqual([['com']])
  open([def('mover', ['a', 'b']), run('mover', 2)])
  const detach = attachPythonCallLabels(workspace)
  expect(labels()).toEqual([['com a', ', b']])
  definition().setFieldValue('a, a', 'PARAMS')
  await settle()
  expect(labels()).toEqual([['com', ',']])
  detach()
})

test('the labels are presentation only: no event, no undo step, the same saved blocks', async () => {
  open([def('mover', ['distancia']), run('mover', 1)])
  await settle()
  const saved = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
  const events: string[] = []
  workspace.addChangeListener((event) => events.push(event.type))
  refreshPythonCallLabels(workspace)
  await settle()
  expect(labels()).toEqual([['com distancia']])
  expect(events).toEqual([])
  expect(workspace.getUndoStack().length).toBe(0)
  expect(JSON.stringify(Blockly.serialization.workspaces.save(workspace))).toBe(saved)
})
