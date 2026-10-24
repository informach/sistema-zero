import type { PythonNode } from '../language/types'
import type { PythonBlockCodec, PythonBlockRole, PythonBlockShape } from './contract'

type ShadowState = {
  type: string
  extraState: unknown
  fields?: Record<string, string>
  inputs?: Record<string, { shadow: ShadowState }>
}
export type PythonPaletteBlockInfo = {
  kind: 'block'
  type: string
  extraState?: unknown
  fields?: Record<string, string>
  inputs?: Record<string, { shadow: ShadowState }>
}

const cache = new WeakMap<readonly PythonBlockCodec[], Map<string, PythonPaletteBlockInfo>>()

function layout(shape: PythonBlockShape) {
  return {
    version: 1,
    layout: {
      fields: shape.fields,
      inputs: shape.inputs.map(({ name, label, role }) => ({ name, label, role })),
      extra: shape.extra,
    },
  }
}

/**
 * Palette blocks arrive complete: every value socket starts with its documented default as a
 * shadow block (like the JavaScript palette), so a block dragged out already runs and the
 * child only replaces what it wants to change.
 */
export function pythonPaletteBlockState(
  codec: PythonBlockCodec,
  codecs: readonly PythonBlockCodec[],
): PythonPaletteBlockInfo {
  let byId = cache.get(codecs)
  if (!byId) {
    byId = new Map()
    cache.set(codecs, byId)
  }
  const known = byId.get(codec.id)
  if (known) return known
  function decoded(value: PythonNode, role: PythonBlockRole) {
    for (const candidate of codecs) {
      if (candidate.hidden) continue
      if (!(candidate.role === role || (role === 'format' && candidate.id === 'sz_py_text')))
        continue
      const shape = candidate.decode(value)
      if (shape) return { codec: candidate, shape }
    }
  }
  function inputsOf(shape: PythonBlockShape, depth: number) {
    const inputs: Record<string, { shadow: ShadowState }> = {}
    for (const input of shape.inputs) {
      if (input.role === 'statement' || input.nodes.length !== 1 || depth > 6) continue
      const child = decoded(input.nodes[0]!, input.role)
      if (child) inputs[input.name] = { shadow: stateOf(child.codec, child.shape, depth + 1) }
    }
    return inputs
  }
  function stateOf(owner: PythonBlockCodec, shape: PythonBlockShape, depth: number): ShadowState {
    const inputs = inputsOf(shape, depth)
    return {
      type: owner.id,
      extraState: layout(shape),
      ...(shape.fields.length
        ? { fields: Object.fromEntries(shape.fields.map((field) => [field.name, field.value])) }
        : {}),
      ...(Object.keys(inputs).length ? { inputs } : {}),
    }
  }
  const shape = codec.decode(codec.defaultNode())
  const info: PythonPaletteBlockInfo = shape
    ? { kind: 'block', ...stateOf(codec, shape, 0) }
    : { kind: 'block', type: codec.id }
  byId.set(codec.id, info)
  return info
}
