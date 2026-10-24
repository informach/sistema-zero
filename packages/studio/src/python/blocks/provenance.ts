import type { PythonNode, PythonValue } from '../language/types'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'
import { isNode, nodes } from './nodes'
import { type PythonBlockProjection, type PythonVisualNode, pythonVisualToAST } from './projection'
import { pythonDecodeContextFromExtra } from './resolverOptions'
import { samePythonValue } from './semantic'

export type PythonWorkspaceOrigins = ReadonlyMap<string, PythonNode>

/** An undo-restored/deleted block must not resurrect IDs from an older parse. */
export function withoutPythonOrigins(value: PythonNode): PythonNode {
  function clean(child: PythonValue): PythonValue {
    if (Array.isArray(child)) return child.map(clean)
    if (!isNode(child)) return structuredClone(child)
    return {
      kind: child.kind,
      fields: Object.fromEntries(
        Object.entries(child.fields).map(([key, item]) => [key, clean(item)]),
      ),
    }
  }
  return clean(value) as PythonNode
}

/**
 * Bind stable Blockly IDs to the *new* parse, outside Blockly's undo journal.
 * Captured shapes must describe the entire verified program. This neither
 * rebuilds the workspace nor changes its history, positions or connections.
 */
export function bindPythonVisualOrigins(
  projection: PythonBlockProjection,
  tree: PythonNode,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
): PythonWorkspaceOrigins {
  const actual = structuredClone(tree)
  const candidate = pythonVisualToAST(projection, codecs)
  if (
    actual.kind !== 'Module' ||
    !nodes(actual.fields.body) ||
    !samePythonValue(candidate.fields.body, actual.fields.body)
  )
    throw new Error('Os blocos não correspondem ao código validado.')
  const registry = new Map(codecs.map((codec) => [codec.id, codec]))
  const origins = new Map<string, PythonNode>()
  let count = 0
  function bind(visual: PythonVisualNode, parsed: PythonNode, depth: number) {
    if (++count > 20_000 || depth > 80 || !visual.blockId || origins.has(visual.blockId))
      throw new Error('A identidade dos blocos Python precisa ser atualizada.')
    origins.set(visual.blockId, parsed)
    if (visual.kind === 'source') return
    const shape = registry
      .get(visual.codecId)
      ?.decode(parsed, pythonDecodeContextFromExtra(visual.extra))
    if (!shape || shape.inputs.length !== visual.inputs.length)
      throw new Error('A estrutura dos blocos Python mudou.')
    for (const input of visual.inputs) {
      const actualInput = shape.inputs.find(
        (item) => item.name === input.name && item.role === input.role,
      )
      if (!actualInput) throw new Error('A estrutura dos blocos Python mudou.')
      // The full candidate AST above already proves the implicit no-op. No
      // visual ID is fabricated for a required suite's generated pass statement.
      if (
        input.role === 'statement' &&
        !input.nodes.length &&
        actualInput.nodes.length === 1 &&
        actualInput.nodes[0]!.kind === 'Pass'
      )
        continue
      if (actualInput.nodes.length !== input.nodes.length)
        throw new Error('A estrutura dos blocos Python mudou.')
      input.nodes.forEach((child, index) => {
        bind(child, actualInput.nodes[index]!, depth + 1)
      })
    }
  }
  const body = actual.fields.body
  projection.body.forEach((visual, index) => {
    bind(visual, body[index]!, 0)
  })
  return origins
}
