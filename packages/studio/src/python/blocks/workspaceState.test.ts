import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import {
  type PythonBlocklyBlock,
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
} from './blockly'
import { expression, integer, moduleNode } from './nodes'
import { pythonASTToVisual, pythonVisualToAST } from './projection'
import { bindPythonVisualOrigins } from './provenance'
import {
  recoverPythonWorkspaceOrigins,
  samePythonWorkspaceProgram,
  savePythonWorkspace,
} from './workspaceState'

test('moving roots preserves the program; editing a field or connection does not', () => {
  const workspace = new Blockly.Workspace()
  try {
    const tree = moduleNode([expression(integer('1')), expression(integer('2'))])
    const roots = pythonVisualToWorkspace(pythonASTToVisual(tree), workspace)
    const origins = bindPythonVisualOrigins(pythonWorkspaceToVisual(workspace, roots), tree)
    const before = savePythonWorkspace(workspace, origins)
    const root = workspace.getBlockById(roots[0]!)!
    root.moveBy(100, 200)
    const moved = savePythonWorkspace(workspace, origins)
    expect(moved).not.toEqual(before)
    expect(samePythonWorkspaceProgram(before, moved)).toBe(true)
    const literal = workspace.getBlocksByType('sz_py_integer', false)[0]!
    literal.setFieldValue('3', 'NUMBER')
    expect(samePythonWorkspaceProgram(moved, savePythonWorkspace(workspace, origins))).toBe(false)
    literal.setFieldValue('1', 'NUMBER')
    root.getNextBlock()!.unplug()
    expect(samePythonWorkspaceProgram(moved, savePythonWorkspace(workspace, origins))).toBe(false)
  } finally {
    workspace.dispose()
  }
})

test('saved draft receives current provenance while the live undo metadata stays untouched', () => {
  const workspace = new Blockly.Workspace(),
    restored = new Blockly.Workspace()
  try {
    const original = moduleNode([expression(integer('1'))])
    const statement = original.fields.body as import('../language/types').PythonNode[]
    statement[0]!.id = '1'
    statement[0]!.range = { start: 0, end: 1 }
    const roots = pythonVisualToWorkspace(pythonASTToVisual(original), workspace)
    const root = workspace.getBlockById(roots[0]!) as PythonBlocklyBlock
    const current = structuredClone(original)
    const freshStatement = current.fields.body as import('../language/types').PythonNode[]
    freshStatement[0]!.id = '20'
    freshStatement[0]!.range = { start: 3, end: 4 }
    const origins = bindPythonVisualOrigins(pythonWorkspaceToVisual(workspace, roots), current)
    const before = structuredClone(root.pythonState.origin)
    const saved = savePythonWorkspace(workspace, origins)
    expect(root.pythonState.origin).toEqual(before)
    Blockly.serialization.workspaces.load(saved, restored)
    const recovered = recoverPythonWorkspaceOrigins(restored, current)
    expect(recovered.get(root.id)?.id).toBe('20')
    const regenerated = pythonVisualToAST(
      pythonWorkspaceToVisual(restored, roots, [], undefined, recovered),
    )
    expect((regenerated.fields.body as typeof statement)[0]?.range).toEqual({ start: 3, end: 4 })
    expect(recoverPythonWorkspaceOrigins(restored, original).has(root.id)).toBe(false)
  } finally {
    workspace.dispose()
    restored.dispose()
  }
})
