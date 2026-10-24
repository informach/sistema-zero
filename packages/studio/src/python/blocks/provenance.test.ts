import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { PythonNode, PythonValue } from '../language/types'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import { expression, integer, isNode, moduleNode, node, pythonSemanticTree } from './nodes'
import { pythonASTToVisual, pythonVisualToAST } from './projection'
import { bindPythonVisualOrigins } from './provenance'

function identities(tree: PythonNode, offset: number) {
  const copy = structuredClone(tree)
  function mark(value: PythonValue) {
    if (Array.isArray(value)) {
      for (const child of value) mark(child)
      return
    }
    if (!isNode(value)) return
    value.id = String(++offset)
    value.range = { start: offset, end: offset + 1 }
    for (const child of Object.values(value.fields)) mark(child)
  }
  mark(copy)
  return copy
}

test('fresh parse origins survive value undo without restoring stale ranges from Blockly history', async () => {
  const workspace = new Blockly.Workspace()
  try {
    const first = identities(moduleNode([expression(integer('1'))]), 0)
    const roots = pythonVisualToWorkspace(pythonASTToVisual(first), workspace)
    await new Promise((resolve) => setTimeout(resolve, 10))
    workspace.clearUndo()
    const number = workspace.getAllBlocks(false).find((block) => block.type === 'sz_py_integer')!
    number.setFieldValue('1000', 'NUMBER')
    const changed = pythonWorkspaceToVisual(workspace, roots)
    const fresh = identities(pythonVisualToAST(changed), 50)
    const origins = bindPythonVisualOrigins(changed, fresh)
    await new Promise((resolve) => setTimeout(resolve, 10))
    workspace.undo(false)
    const undone = pythonVisualToAST(
      pythonWorkspaceToVisual(workspace, roots, [], undefined, origins),
    )
    expect(pythonSemanticTree(undone)).toEqual(pythonSemanticTree(first))
    expect(JSON.stringify(undone)).toContain('"start":52')
    expect(number.getFieldValue('NUMBER')).toBe('1')
    workspace.undo(true)
    expect(
      pythonSemanticTree(
        pythonVisualToAST(pythonWorkspaceToVisual(workspace, roots, [], undefined, origins)),
      ),
    ).toEqual(pythonSemanticTree(fresh))
  } finally {
    workspace.dispose()
  }
})

test('opaque blocks restored without a current origin cannot resurrect obsolete descendant IDs', () => {
  const workspace = new Blockly.Workspace()
  try {
    const original = identities(moduleNode([node('Assert', { test: integer('1'), msg: null })]), 10)
    const roots = pythonVisualToWorkspace(pythonASTToVisual(original), workspace)
    const projection = pythonWorkspaceToVisual(workspace, roots)
    const fresh = identities(original, 50)
    const bound = bindPythonVisualOrigins(projection, fresh)
    const retained = pythonVisualToAST(
      pythonWorkspaceToVisual(workspace, roots, [], undefined, bound),
    )
    expect(retained.fields.body).toEqual(fresh.fields.body)
    const restored = pythonVisualToAST(
      pythonWorkspaceToVisual(workspace, roots, [], undefined, new Map()),
    )
    expect<unknown>(restored).toEqual(pythonSemanticTree(original))
    expect(() => bindPythonVisualOrigins(projection, moduleNode([]))).toThrow('correspondem')
    projection.body[0]!.blockId = undefined
    expect(() => bindPythonVisualOrigins(projection, original)).toThrow('identidade')
  } finally {
    workspace.dispose()
  }
})

test('required empty suites emit pass and bind only visible blocks without enabling optional branches', () => {
  for (const codec of PYTHON_PROGRAMMING_CODECS) {
    const shape = codec.decode(codec.defaultNode())
    const body = shape?.inputs.find((input) => input.name === 'body' && input.role === 'statement')
    if (!shape || !body) continue
    body.nodes = []
    const encoded = codec.encode(shape)
    expect(encoded.fields.body).toEqual([node('Pass')])
    if (codec.role !== 'statement') continue
    const workspace = new Blockly.Workspace()
    try {
      const tree = moduleNode([codec.defaultNode()])
      const roots = pythonVisualToWorkspace(pythonASTToVisual(tree), workspace)
      const block = workspace.getBlockById(roots[0]!)!
      // A required suite holding only `pass` is shown empty; there may be no child to remove.
      block.getInputTargetBlock('body')?.dispose(false)
      const projection = pythonWorkspaceToVisual(workspace, roots)
      const actual = identities(pythonVisualToAST(projection), 100)
      expect(bindPythonVisualOrigins(projection, actual).size).toBe(
        workspace.getAllBlocks(false).length,
      )
      const ifCode = PYTHON_PROGRAMMING_CODECS.find((entry) => entry.id === 'sz_py_if')!
      expect(ifCode.encode(ifCode.decode(ifCode.defaultNode())!).fields.orelse).toEqual([])
    } finally {
      workspace.dispose()
    }
  }
})
