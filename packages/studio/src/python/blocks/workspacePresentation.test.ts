import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { expression, integer, moduleNode } from './nodes'
import { pythonASTToVisual } from './projection'
import { bindPythonVisualOrigins } from './provenance'
import { orderPythonWorkspaceRoots } from './workspacePresentation'

test('a split stack retains its original position before a later independent stack', () => {
  const workspace = new Blockly.Workspace()
  try {
    const statements = ['1', '2', '3'].map((value, index) => ({
      ...expression(integer(value)),
      id: String(index + 1),
      range: { start: index * 2, end: index * 2 + 1 },
    }))
    const tree = moduleNode(statements)
    const roots = pythonVisualToWorkspace(pythonASTToVisual(tree), workspace)
    const origins = bindPythonVisualOrigins(pythonWorkspaceToVisual(workspace, roots), tree)
    const first = workspace.getBlockById(roots[0]!)!
    const second = first.getNextBlock()!
    const third = second.getNextBlock()!
    third.unplug()
    const previous = orderPythonWorkspaceRoots(workspace, origins, roots)
    expect(previous).toEqual([first.id, third.id])
    second.unplug()
    second.moveBy(0, 1000)
    expect(orderPythonWorkspaceRoots(workspace, origins, previous)).toEqual([
      first.id,
      second.id,
      third.id,
    ])
    first.nextConnection!.connect(second.previousConnection!)
    expect(orderPythonWorkspaceRoots(workspace, origins, previous)).toEqual([first.id, third.id])
    const wrapper = workspace.newBlock('sz_py_if')
    wrapper.getInput('body:0')!.connection!.connect(first.previousConnection!)
    expect(orderPythonWorkspaceRoots(workspace, origins, previous)).toEqual([wrapper.id, third.id])
  } finally {
    workspace.dispose()
  }
})
