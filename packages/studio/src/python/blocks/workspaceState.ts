import * as Blockly from 'blockly/core'
import { jsonPlainCopy } from '../../blockly/jsonPlainCopy'
import type { PythonNode, PythonValue } from '../language/types'
import type { PythonBlocklyBlock } from './blockly'
import { isNode, pythonSemanticTree } from './nodes'
import { PYTHON_PROGRAM } from './programArea'
import type { PythonOpaqueBlock, PythonVisualOrigin } from './projection'
import { type PythonWorkspaceOrigins, withoutPythonOrigins } from './provenance'

/** Presentation and scratch blocks do not change the executable program. */
export function samePythonWorkspaceProgram(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  // Sem recursão: uma sequência longa no mesmo corpo é uma cadeia `next` tão funda quanto ela
  // (lote 3 da missão, 21/11/2026). A cópia em objetos comuns e o laço com pilha explícita tiram a
  // apresentação de cada bloco e sombra, mantendo a ordem das chaves.
  const executable = (state: Record<string, unknown>) => {
    const saved = state as ReturnType<typeof Blockly.serialization.workspaces.save>
    const roots = saved.blocks?.blocks as Blockly.serialization.blocks.State[] | undefined
    if (!roots) return jsonPlainCopy(state)
    const areas = roots.filter((block) => block.type === PYTHON_PROGRAM)
    const selected = areas.length === 1 ? areas : roots
    const copy = jsonPlainCopy({ blocks: { ...saved.blocks, blocks: selected } }) as {
      blocks: { blocks: Record<string, unknown>[] }
    }
    const pending = [...copy.blocks.blocks]
    while (pending.length) {
      const block = pending.pop() as Record<string, unknown>
      delete block.x
      delete block.y
      delete block.collapsed
      delete block.icons
      const connections = [
        ...Object.values((block.inputs ?? {}) as Record<string, Record<string, unknown>>),
        ...(block.next ? [block.next as Record<string, unknown>] : []),
      ]
      for (const connection of connections) {
        if (connection.block) pending.push(connection.block as Record<string, unknown>)
        if (connection.shadow) pending.push(connection.shadow as Record<string, unknown>)
      }
    }
    return copy
  }
  return JSON.stringify(executable(before)) === JSON.stringify(executable(after))
}

function sourceWithCurrentOrigin(value: PythonOpaqueBlock, parsed?: PythonNode): PythonOpaqueBlock {
  const node =
    parsed &&
    JSON.stringify(pythonSemanticTree(value.node)) === JSON.stringify(pythonSemanticTree(parsed))
      ? structuredClone(parsed)
      : withoutPythonOrigins(value.node)
  return { ...value, node, origin: { nodeId: node.id, range: node.range } }
}

/** Save current source provenance without mutating live blocks or their undo events. */
export function savePythonWorkspace(
  workspace: Blockly.Workspace,
  origins: PythonWorkspaceOrigins,
): Record<string, unknown> {
  return rebasePythonWorkspaceState(Blockly.serialization.workspaces.save(workspace), origins)
}

/** Rebase the immutable gesture snapshot, never a workspace changed during parsing. */
export function rebasePythonWorkspaceState(
  state: Record<string, unknown>,
  origins: PythonWorkspaceOrigins,
): Record<string, unknown> {
  // Cópia em objetos comuns e sem recursão (`structuredClone` estoura com 859 blocos numa cadeia
  // no Chromium 159; o estado do Blockly é JSON, então a cópia pelas regras do JSON é exata).
  const saved = jsonPlainCopy(state) as ReturnType<typeof Blockly.serialization.workspaces.save>
  const roots = saved.blocks?.blocks as Blockly.serialization.blocks.State[] | undefined
  const queue = [...(roots ?? [])]
  while (queue.length) {
    const state = queue.pop()!
    const parsed = state.id ? origins.get(state.id) : undefined
    if (state.type.startsWith('sz_py_source_'))
      state.extraState = sourceWithCurrentOrigin(state.extraState as PythonOpaqueBlock, parsed)
    else if (state.type.startsWith('sz_py_') && state.type !== PYTHON_PROGRAM) {
      state.extraState = {
        ...state.extraState,
        origin: parsed ? { nodeId: parsed.id, range: structuredClone(parsed.range) } : undefined,
      }
    } else if (state.type !== PYTHON_PROGRAM)
      throw new Error('O rascunho contém um bloco de outro ambiente.')
    for (const connection of [
      ...Object.values(state.inputs ?? {}),
      ...(state.next ? [state.next] : []),
    ]) {
      if (connection.block) queue.push(connection.block)
      if (connection.shadow) queue.push(connection.shadow)
    }
  }
  return saved
}

/**
 * Call only after reparsing the draft's exact baseSource and validating/loading its
 * Blockly state. Saved IDs are hints; only IDs/ranges present in that parse bind.
 * Incomplete inputs are allowed here because recovery precedes visual validation.
 */
export function recoverPythonWorkspaceOrigins(
  workspace: Blockly.Workspace,
  tree: PythonNode,
): PythonWorkspaceOrigins {
  const known = new Map<string, PythonNode>()
  const queue: PythonValue[] = [structuredClone(tree)]
  while (queue.length) {
    const value = queue.pop()!
    if (Array.isArray(value)) queue.push(...value)
    else if (isNode(value)) {
      if (value.id) known.set(value.id, value)
      queue.push(...Object.values(value.fields))
    }
  }
  const origins = new Map<string, PythonNode>()
  const claimed = new Set<string>()
  for (const block of workspace.getAllBlocks(false)) {
    const origin: PythonVisualOrigin | undefined = block.type.startsWith('sz_py_source_')
      ? (block as Blockly.Block & { pythonSource: PythonOpaqueBlock }).pythonSource.origin
      : (block as PythonBlocklyBlock).pythonState?.origin
    if (!origin?.nodeId) continue
    const parsed = known.get(origin.nodeId)
    if (
      !parsed ||
      parsed.range?.start !== origin.range?.start ||
      parsed.range?.end !== origin.range?.end
    )
      continue
    if (claimed.has(origin.nodeId))
      throw new Error('O rascunho repete a identidade de um trecho Python.')
    claimed.add(origin.nodeId)
    origins.set(block.id, parsed)
  }
  return origins
}
