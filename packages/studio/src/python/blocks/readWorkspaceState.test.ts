import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { expression, integer, moduleNode } from './nodes'
import { pythonASTToVisual } from './projection'
import { readPythonWorkspaceState } from './readWorkspaceState'

test('recovery refuses foreign block initializers and serializers before Blockly sees them', () => {
  let calls = 0
  Blockly.Blocks.foreign_python_test = {
    init() {
      calls++
    },
  }
  try {
    expect(() =>
      readPythonWorkspaceState({
        blocks: { languageVersion: 0, blocks: [{ type: 'foreign_python_test', id: 'foreign' }] },
      }),
    ).toThrow('restaurar')
    expect(() => readPythonWorkspaceState({ otherLanguage: {} })).toThrow('restaurar')
    expect(calls).toBe(0)
  } finally {
    delete Blockly.Blocks.foreign_python_test
  }
})

test('valid Python state and workspace comments survive preflight without touching the visible workspace', () => {
  const workspace = new Blockly.Workspace()
  try {
    pythonVisualToWorkspace(pythonASTToVisual(moduleNode([expression(integer('1'))])), workspace)
    const saved = Blockly.serialization.workspaces.save(workspace)
    saved.workspaceComments = [
      { id: 'note', text: 'Meu desenho 🐢', x: 20, y: 30, width: 200, height: 100 },
    ]
    expect(readPythonWorkspaceState(saved)).toEqual(saved)
    expect(workspace.getAllBlocks(false)).toHaveLength(2)
    saved.blocks.blocks[0].extraState.layout = {}
    expect(() => readPythonWorkspaceState(saved)).toThrow('restaurar')
    expect(workspace.getAllBlocks(false)).toHaveLength(2)
  } finally {
    workspace.dispose()
  }
})

test('recovery preserves unfinished numbers and refuses ignored fields or invalid Blockly properties', () => {
  const workspace = new Blockly.Workspace(),
    restored = new Blockly.Workspace()
  try {
    pythonVisualToWorkspace(pythonASTToVisual(moduleNode([expression(integer('1'))])), workspace)
    const number = workspace.getAllBlocks(false).find((block) => block.type === 'sz_py_integer')!
    number.setFieldValue('12a', 'NUMBER')
    const saved = Blockly.serialization.workspaces.save(workspace)
    Blockly.serialization.workspaces.load(readPythonWorkspaceState(saved), restored)
    expect(restored.getBlockById(number.id)?.getFieldValue('NUMBER')).toBe('12a')
    const invalidField = structuredClone(saved)
    invalidField.blocks.blocks[0].inputs.VALUE.block.fields = { WRONG_FIELD: 'pending value' }
    expect(() => readPythonWorkspaceState(invalidField)).toThrow('restaurar')
    const invalidTitle = structuredClone(saved)
    invalidTitle.blocks.blocks[0].fields = { PYTHON_TITLE: 'Um comando diferente' }
    expect(() => readPythonWorkspaceState(invalidTitle)).toThrow('restaurar')
    for (const properties of [
      { x: 'bad', y: {} },
      { data: {} },
      { editable: 'false' },
      { disabledReasons: 'oops' },
      { disabledReasons: ['MANUALLY_DISABLED'] },
      { enabled: false },
    ]) {
      const invalid = structuredClone(saved)
      Object.assign(invalid.blocks.blocks[0], properties)
      expect(() => readPythonWorkspaceState(invalid)).toThrow('restaurar')
    }
  } finally {
    workspace.dispose()
    restored.dispose()
  }
})

test('disabled Python blocks cannot silently produce executable source', () => {
  const workspace = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(
      pythonASTToVisual(moduleNode([expression(integer('1'))])),
      workspace,
    )
    for (const block of workspace.getAllBlocks(false)) {
      block.setDisabledReason(true, 'MANUALLY_DISABLED')
      expect(() => pythonWorkspaceToVisual(workspace, roots)).toThrow('desativado')
      expect(() =>
        readPythonWorkspaceState(Blockly.serialization.workspaces.save(workspace)),
      ).toThrow('restaurar')
      block.setDisabledReason(false, 'MANUALLY_DISABLED')
      expect(() => pythonWorkspaceToVisual(workspace, roots)).not.toThrow()
    }
  } finally {
    workspace.dispose()
  }
})
