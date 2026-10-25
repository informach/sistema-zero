import type { PythonNode, PythonSourceRange } from '../language/types'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import { pythonCodecIndex } from './codecIndex'
import type {
  PythonBlockCodec,
  PythonBlockField,
  PythonBlockRole,
  PythonBlockShape,
} from './contract'
import { isNode, nodes } from './nodes'
import { pythonResolverOptionsOf } from './resolverOptions'
import { type PythonProjectModules, pythonBindingResolver } from './scope'
import { pythonShapeFitsBlock } from './shapeControls'

export interface PythonVisualOrigin {
  nodeId?: string
  range?: PythonSourceRange
}
export interface PythonVisualBlock {
  kind: 'block'
  /** Ephemeral workspace identity; never a Python AST identity or source authority. */
  blockId?: string
  codecId: string
  role: PythonBlockRole
  fields: PythonBlockField[]
  inputs: { name: string; label: string; role: PythonBlockRole; nodes: PythonVisualNode[] }[]
  extra?: PythonBlockShape['extra']
  origin?: PythonVisualOrigin
}
export interface PythonOpaqueBlock {
  kind: 'source'
  blockId?: string
  role: PythonBlockRole
  /** Explicit opaque syntax, never presented as a fully understood visual block. */
  node: PythonNode
  origin?: PythonVisualOrigin
}
export type PythonVisualNode = PythonVisualBlock | PythonOpaqueBlock
export interface PythonBlockProjection {
  body: PythonVisualNode[]
  typeIgnores: PythonNode[]
}

interface GuardedAttributes {
  /** Replacing one of these on any official object changes an official API. */
  anywhere: ReadonlySet<string>
  /**
   * Names along a module path only (pygame.image.load, pygame.draw.rect): only a store on a
   * module replaces them, so `self.image = ...` in a sprite is ordinary object state.
   */
  onModules: ReadonlySet<string>
}
const guardedByCodecs = new WeakMap<readonly PythonBlockCodec[], GuardedAttributes>()
/** Names that bound codecs resolve through: replacing one would change an official API. */
function guardedAttributes(codecs: readonly PythonBlockCodec[]): GuardedAttributes {
  const known = guardedByCodecs.get(codecs)
  if (known) return known
  const anywhere = new Set<string>()
  const onModules = new Set<string>()
  for (const codec of codecs) {
    if (!codec.binding && !codec.bindingFor) continue
    const receiverBinding = codec.bindingFor?.(codec.defaultNode())
    // A function reached through module attributes only, never through an object.
    const reached = codec.binding ?? receiverBinding
    const modulePath =
      !!reached?.module &&
      !reached.instance &&
      !reached.handler &&
      !reached.builtin &&
      !reached.moduleOrInstance &&
      !reached.anyReceiver
    const found = modulePath ? onModules : anywhere
    // A bare Python built-in (open, range) is not an attribute of anything the child can
    // reassign with `x.open = ...`; only `builtins.open = ...` could, and the resolver
    // treats every write to the builtins module as a replacement.
    // (A handler such as `def update` is not a bare built-in: it stays guarded.)
    const bareBuiltin =
      codec.binding && !codec.binding.module && !codec.binding.builtin && !codec.binding.handler
    if (codec.binding && !bareBuiltin) found.add(codec.binding.root)
    if (codec.binding?.member) found.add(codec.binding.member)
    for (const extra of codec.alsoBound ?? []) if (extra.root) found.add(extra.root)
    let template = codec.defaultNode()
    if (template.kind === 'Expr' && isNode(template.fields.value)) template = template.fields.value
    // A method of a built-in type (lista.clear, arquivo.write) cannot be replaced by an
    // attribute store either: the receiver is a list or a file, never an official object.
    // (A file whose method is replaced, f.write = print, loses its proof in the resolver.)
    if (receiverBinding && !receiverBinding.root && !receiverBinding.builtin) continue
    // Only callables are guarded: writing a data property (actor.x) is ordinary use.
    if (template.kind !== 'Call') continue
    let path: PythonNode | undefined = isNode(template.fields.func)
      ? template.fields.func
      : undefined
    while (path?.kind === 'Attribute') {
      if (typeof path.fields.attr === 'string') found.add(path.fields.attr)
      path = isNode(path.fields.value) ? path.fields.value : undefined
    }
    // A method template's receiver is only a sample variable, not an API name.
    if (
      !codec.bindingFor &&
      !bareBuiltin &&
      path?.kind === 'Name' &&
      typeof path.fields.id === 'string'
    )
      found.add(path.fields.id)
  }
  // A name guarded anywhere stays guarded anywhere.
  for (const name of anywhere) onModules.delete(name)
  const guarded = { anywhere, onModules }
  guardedByCodecs.set(codecs, guarded)
  return guarded
}

export function pythonASTToVisual(
  tree: PythonNode,
  options: {
    codecs?: readonly PythonBlockCodec[]
    officialModules?: ReadonlySet<string>
    /** What `from <project module> import *` binds (`pythonProjectModules`). */
    projectModules?: PythonProjectModules
  } = {},
): PythonBlockProjection {
  if (tree.kind !== 'Module' || !nodes(tree.fields.body) || !nodes(tree.fields.type_ignores))
    throw new Error('O programa Python precisa de um módulo completo.')
  const codecs = options.codecs ?? PYTHON_PROGRAMMING_CODECS
  const guarded = guardedAttributes(codecs)
  const resolves = pythonBindingResolver(tree, options.officialModules, guarded.anywhere, {
    ...pythonResolverOptionsOf(codecs),
    projectModules: options.projectModules,
    moduleAttributes: guarded.onModules,
  })
  const context = { isModule: resolves.isModule }
  const index = pythonCodecIndex(codecs)
  let count = 0
  function project(value: PythonNode, role: PythonBlockRole, depth = 0): PythonVisualNode {
    if (++count > 20_000 || depth > 80) throw new Error('O programa excede o limite visual.')
    const origin = { nodeId: value.id, range: value.range }
    for (const codec of index.candidates(value)) {
      const compatibleRole = codec.role === role || (role === 'format' && codec.id === 'sz_py_text')
      if (!compatibleRole) continue
      const binding = codec.bindingFor ? codec.bindingFor(value) : codec.binding
      if ((codec.bindingFor && !binding) || !resolves(value, binding)) continue
      if (codec.alsoBound?.some((extra) => !resolves(value, extra))) continue
      if (codec.receiverKinds) {
        // A command is an Expr statement around the call; the receiver is on the call.
        const callNode =
          value.kind === 'Expr' && isNode(value.fields.value) ? value.fields.value : value
        const func = callNode.fields.func
        const receiver = isNode(func) && func.kind === 'Attribute' ? func.fields.value : undefined
        const kind = isNode(receiver)
          ? receiver.kind === 'Constant' && typeof receiver.fields.value === 'string'
            ? 'text'
            : receiver.kind === 'Name'
              ? resolves.receiverKind(receiver)
              : receiver.kind
          : undefined
        if (!codec.receiverKinds.some((allowed) => allowed === kind)) continue
      }
      const shape = codec.decode(value, context)
      // A block Blockly would refuse to load (blockly.ts readState) is no block at all.
      if (!shape || !pythonShapeFitsBlock(shape)) continue
      return {
        kind: 'block',
        codecId: codec.id,
        role,
        fields: shape.fields,
        extra: shape.extra,
        origin,
        inputs: shape.inputs.map((input) => ({
          ...input,
          nodes: input.nodes.map((child) => project(child, input.role, depth + 1)),
        })),
      }
    }
    return { kind: 'source', role, node: value, origin }
  }
  return {
    body: tree.fields.body.map((value) => project(value, 'statement')),
    typeIgnores: tree.fields.type_ignores,
  }
}

export function pythonVisualToAST(
  projection: PythonBlockProjection,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
): PythonNode {
  const registry = new Map(codecs.map((codec) => [codec.id, codec]))
  let count = 0
  function encode(value: PythonVisualNode, depth = 0): PythonNode {
    if (++count > 20_000 || depth > 80) throw new Error('O programa excede o limite visual.')
    if (value.kind === 'source') return value.node
    const codec = registry.get(value.codecId)
    if (!codec) throw new Error('Este bloco Python não está disponível.')
    const result = codec.encode({
      fields: value.fields,
      extra: value.extra,
      inputs: value.inputs.map((input) => ({
        ...input,
        nodes: input.nodes.map((child) => encode(child, depth + 1)),
      })),
    })
    return { ...result, id: value.origin?.nodeId, range: value.origin?.range }
  }
  return {
    kind: 'Module',
    fields: {
      body: projection.body.map((value) => encode(value)),
      type_ignores: projection.typeIgnores,
    },
  }
}
