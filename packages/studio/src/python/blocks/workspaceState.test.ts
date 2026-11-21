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
  rebasePythonWorkspaceState,
  recoverPythonWorkspaceOrigins,
  samePythonWorkspaceProgram,
  savePythonWorkspace,
} from './workspaceState'

/**
 * Uma sequência longa de instruções no mesmo corpo, no formato do `save` do Blockly: objetos sem
 * protótipo e uma cadeia `next`. Lote 3 da missão (21/11/2026): o `structuredClone` desse estado
 * estoura com 859 blocos no Chromium 159 e com 20 mil no JavaScriptCore; a comparação recursiva,
 * com 40 mil aqui.
 */
function longPythonChain(length: number, x = 0) {
  const block = (index: number) =>
    Object.assign(Object.create(null), {
      type: 'sz_py_expression',
      id: `b${index}`,
      extraState: { origin: { nodeId: `n${index}` } },
    })
  const root = Object.assign(block(0), { x, y: 0 })
  let cursor = root
  for (let index = 1; index < length; index++) {
    const next = block(index)
    cursor.next = Object.assign(Object.create(null), { block: next })
    cursor = next
  }
  return { blocks: { languageVersion: 0, blocks: [root] } } as Record<string, unknown>
}

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

test('uma sequência muito mais longa que a pilha guarda e compara sem recursão', () => {
  const state = longPythonChain(30_000)
  const saved = rebasePythonWorkspaceState(state, new Map())
  // Objetos comuns na saída: o JSON.stringify do V8 só anda sem recursão neles.
  expect(Object.getPrototypeOf(saved)).toBe(Object.prototype)
  let depth = 0
  let cursor = (saved.blocks as { blocks: Record<string, unknown>[] }).blocks[0]
  while (cursor?.next) {
    expect(Object.getPrototypeOf(cursor)).toBe(Object.prototype)
    cursor = (cursor.next as { block: Record<string, unknown> }).block
    depth++
  }
  expect(depth).toBe(29_999)
  // A origem é a do mapa de agora: nenhuma neste mapa vazio.
  expect((cursor?.extraState as { origin?: unknown }).origin).toBeUndefined()
})

test('mover a sequência longa não muda o programa, e a comparação não recursa', () => {
  // 18 mil: a comparação recursiva antiga estoura acima de ~15 mil no Bun do Windows, e o próprio
  // JSON.stringify do JavaScriptCore (o motor do Bun e do Safari) vai até 20 mil de profundidade.
  expect(samePythonWorkspaceProgram(longPythonChain(18_000), longPythonChain(18_000, 300))).toBe(
    true,
  )
})
