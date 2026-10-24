import * as Blockly from 'blockly/core'
import type { PythonNode } from '../language/types'
import type { PythonBlockCodec } from './contract'
import { type PythonVisualNode, pythonASTToVisual } from './projection'
import type { PythonWorkspaceOrigins } from './provenance'

/** Splitting/merging stacks retains source order; moving pixels never reorders code. */
export function orderPythonWorkspaceRoots(
  workspace: Blockly.Workspace,
  origins: PythonWorkspaceOrigins,
  previous: readonly string[],
): string[] {
  const roots = workspace.getTopBlocks(false)
  const order = new Map(
    [...new Set([...previous, ...roots.map((block) => block.id)])].map((id, index) => [id, index]),
  )
  const anchor = (block: Blockly.Block) => {
    let start = Number.POSITIVE_INFINITY
    for (const child of block.getDescendants(false))
      start = Math.min(start, origins.get(child.id)?.range?.start ?? Number.POSITIVE_INFINITY)
    return start
  }
  const anchored = roots.map((block) => ({ id: block.id, start: anchor(block) }))
  return anchored
    .sort((a, b) => a.start - b.start || order.get(a.id)! - order.get(b.id)!)
    .map((block) => block.id)
}

/** Re-evaluate labels without replacing blocks, connections or undo events. */
export function updatePythonWorkspacePresentation(
  workspace: Blockly.Workspace,
  tree: PythonNode,
  origins: PythonWorkspaceOrigins,
  codecs: readonly PythonBlockCodec[],
  officialModules?: ReadonlySet<string>,
) {
  const canonical = pythonASTToVisual(tree, { codecs, officialModules })
  const projected = new Map<string, PythonVisualNode>()
  const queue = [...canonical.body]
  while (queue.length) {
    const value = queue.pop()!
    if (value.origin?.nodeId) projected.set(value.origin.nodeId, value)
    if (value.kind === 'block') for (const input of value.inputs) queue.push(...input.nodes)
  }
  const registry = new Map(codecs.map((codec) => [codec.id, codec]))
  Blockly.Events.disable()
  try {
    for (const block of workspace.getAllBlocks(false)) {
      const codec = registry.get(block.type)
      if (!codec || !(codec.binding || codec.bindingFor || codec.receiverKinds)) continue
      const origin = origins.get(block.id)
      const current = origin?.id ? projected.get(origin.id) : undefined
      const qualified = current?.kind === 'block' && current.codecId === codec.id
      // The codec still emits the original call. Only its instructional claim
      // changes when the built-in/module/receiver is no longer proven.
      // A call becomes a generic "chamada Python"; anything else (a handler, a with, a window
      // constant) keeps its shape but says the claim must be checked in the code.
      const call = !codec.match?.kinds?.some((kind) => kind !== 'Call' && kind !== 'Expr')
      block
        .getField('PYTHON_TITLE')
        ?.setValue(
          qualified
            ? codec.title
            : call
              ? 'chamada Python (ver código)'
              : `${codec.title} (confira no código)`,
        )
      block.setTooltip(
        qualified
          ? `${codec.help}\nPython: ${codec.api}`
          : 'Este comando continua no código. Como esse nome ou objeto mudou, confira no modo fonte o que ele faz.',
      )
    }
  } finally {
    Blockly.Events.enable()
  }
}
