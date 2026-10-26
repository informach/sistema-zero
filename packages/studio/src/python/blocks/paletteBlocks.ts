import type { PythonNode } from '../language/types'
import type { PythonBlockCodec, PythonBlockRole, PythonBlockShape } from './contract'

type ShadowState = {
  type: string
  extraState: unknown
  fields?: Record<string, string>
  inputs?: Record<string, PythonPaletteInput>
}
/**
 * A value starts as a shadow (dropping a block on it replaces it). A piece that holds commands
 * (a `case`, an `except`) starts as a real block: Blockly refuses any block inside a shadow,
 * so a shadow case could never receive the commands it is for.
 */
export type PythonPaletteInput = { shadow: ShadowState } | { block: ShadowState }
export type PythonPaletteBlockInfo = {
  kind: 'block'
  type: string
  extraState?: unknown
  fields?: Record<string, string>
  inputs?: Record<string, PythonPaletteInput>
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
  const shape = codec.decode(codec.defaultNode())
  const info: PythonPaletteBlockInfo = shape
    ? { kind: 'block', ...shadowOf(codec, shape, codecs, 0) }
    : { kind: 'block', type: codec.id }
  byId.set(codec.id, info)
  return info
}

/**
 * The shadow block for a default value (the same one the palette uses), or undefined when no
 * visible block shows it. A socket added with "Adicionar ..." starts filled with it.
 */
export function pythonShadowState(
  value: PythonNode,
  role: PythonBlockRole,
  codecs: readonly PythonBlockCodec[],
): PythonPaletteInput | undefined {
  const child = decoded(value, role, codecs)
  return child && socketOf(child.codec, child.shape, codecs, 1)
}

function socketOf(
  owner: PythonBlockCodec,
  shape: PythonBlockShape,
  codecs: readonly PythonBlockCodec[],
  depth: number,
): PythonPaletteInput {
  const state = shadowOf(owner, shape, codecs, depth)
  const holdsBlocks =
    shape.inputs.some((input) => input.role === 'statement') ||
    Object.values(state.inputs ?? {}).some((input) => 'block' in input)
  return holdsBlocks ? { block: state } : { shadow: state }
}

function decoded(value: PythonNode, role: PythonBlockRole, codecs: readonly PythonBlockCodec[]) {
  for (const candidate of codecs) {
    if (candidate.hidden) continue
    if (!(candidate.role === role || (role === 'format' && candidate.id === 'sz_py_text'))) continue
    // The same rule as the catalog dependencies (selection.ts): a method block only for
    // the receiver its own example uses.
    if (
      candidate.bindingFor &&
      JSON.stringify(candidate.bindingFor(value)) !==
        JSON.stringify(candidate.bindingFor(candidate.defaultNode()))
    )
      continue
    const shape = candidate.decode(value)
    if (shape) return { codec: candidate, shape }
  }
}

function shadowOf(
  owner: PythonBlockCodec,
  shape: PythonBlockShape,
  codecs: readonly PythonBlockCodec[],
  depth: number,
): ShadowState {
  const inputs: Record<string, PythonPaletteInput> = {}
  for (const input of shape.inputs) {
    if (input.role === 'statement' || input.nodes.length !== 1 || depth > 6) continue
    const child = decoded(input.nodes[0]!, input.role, codecs)
    if (child) inputs[input.name] = socketOf(child.codec, child.shape, codecs, depth + 1)
  }
  return {
    type: owner.id,
    extraState: layout(shape),
    ...(shape.fields.length
      ? { fields: Object.fromEntries(shape.fields.map((field) => [field.name, field.value])) }
      : {}),
    ...(Object.keys(inputs).length ? { inputs } : {}),
  }
}
