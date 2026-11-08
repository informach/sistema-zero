import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { expression, integer, moduleNode } from './nodes'
import { ensurePythonProgramArea, PYTHON_PROGRAM } from './programArea'
import { pythonASTToVisual, pythonVisualToAST } from './projection'
import { readPythonWorkspaceState } from './readWorkspaceState'
import { samePythonWorkspaceProgram, savePythonWorkspace } from './workspaceState'

test('migration preserves source order and disconnected new blocks are persistent non-executable scratch', () => {
  const ws = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(
      pythonASTToVisual(moduleNode([expression(integer('1')), expression(integer('2'))])),
      ws,
    )
    // Older caches can contain several roots; screen position is not source order.
    const oldSecond = ws.getBlockById(roots[0]!)!.getNextBlock()!
    oldSecond.unplug()
    oldSecond.moveBy(0, -100)
    roots.push(oldSecond.id)
    const before = pythonVisualToAST(pythonWorkspaceToVisual(ws, roots))
    const areaIds = ensurePythonProgramArea(ws, roots, 'main.py')
    expect(pythonVisualToAST(pythonWorkspaceToVisual(ws, areaIds))).toEqual(before)
    const saved = savePythonWorkspace(ws, new Map())
    const scratch = ws.newBlock('sz_py_assign') // incomplete is fine outside Programa
    expect(pythonVisualToAST(pythonWorkspaceToVisual(ws, areaIds))).toEqual(before)
    const withScratch = savePythonWorkspace(ws, new Map())
    expect(samePythonWorkspaceProgram(saved, withScratch)).toBe(true)
    expect(readPythonWorkspaceState(withScratch)).toEqual(withScratch)
    const restored = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(readPythonWorkspaceState(withScratch), restored)
      expect(restored.getBlockById(scratch.id)).not.toBeNull()
      expect(pythonVisualToAST(pythonWorkspaceToVisual(restored, areaIds))).toEqual(before)
    } finally {
      restored.dispose()
    }
    scratch.dispose()
    const first = ws.getBlockById(areaIds[0]!)!.getInputTargetBlock('BODY')!
    const second = first.getNextBlock()!
    second.unplug()
    expect(pythonVisualToAST(pythonWorkspaceToVisual(ws, areaIds))).not.toEqual(before)
    expect(samePythonWorkspaceProgram(saved, savePythonWorkspace(ws, new Map()))).toBe(false)
    first.nextConnection!.connect(second.previousConnection!)
    expect(pythonVisualToAST(pythonWorkspaceToVisual(ws, areaIds))).toEqual(before)
  } finally {
    ws.dispose()
  }
})

test('empty programs have an area and duplicate areas are refused', () => {
  const ws = new Blockly.Workspace()
  try {
    const ids = ensurePythonProgramArea(ws, [], 'helper.py')
    expect(ws.getBlockById(ids[0]!)!.isDeletable()).toBe(false)
    expect(pythonWorkspaceToVisual(ws, ids).body).toEqual([])
    expect(ensurePythonProgramArea(ws, ids, 'helper.py')).toEqual(ids)
    ws.newBlock(PYTHON_PROGRAM)
    expect(() => pythonWorkspaceToVisual(ws, ids)).toThrow('única')
    expect(() => readPythonWorkspaceState(savePythonWorkspace(ws, new Map()))).toThrow('restaurar')
  } finally {
    ws.dispose()
  }
})

test('collapsed presentation and scratch fields never hide edits to executable fields', () => {
  const ws = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(
      pythonASTToVisual(moduleNode([expression(integer('1'))])),
      ws,
    )
    ensurePythonProgramArea(ws, roots, 'main.py')
    const original = savePythonWorkspace(ws, new Map())
    const literal = ws.getBlocksByType('sz_py_integer', false)[0]!
    const scratch = ws.newBlock('sz_py_integer')
    scratch.setFieldValue('99', 'NUMBER')
    literal.getParent()!.setCollapsed(true)
    expect(samePythonWorkspaceProgram(original, savePythonWorkspace(ws, new Map()))).toBe(true)
    literal.setFieldValue('2', 'NUMBER')
    expect(samePythonWorkspaceProgram(original, savePythonWorkspace(ws, new Map()))).toBe(false)
  } finally {
    ws.dispose()
  }
})
