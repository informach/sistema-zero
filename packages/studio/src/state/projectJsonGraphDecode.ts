import {
  copyStudioProjectJson,
  STUDIO_PROJECT_JSON_LIMITS,
} from '@sistemazero/core/studio/project-json'
import { type ProjectJsonGraphLimits, validateProjectJsonGraphLimits } from './projectJsonGraph'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function decodeProjectJsonGraph(
  text: string,
  limits: ProjectJsonGraphLimits = STUDIO_PROJECT_JSON_LIMITS,
): unknown {
  validateProjectJsonGraphLimits(limits)
  if (text.length > limits.textChars)
    throw new Error('A cópia de recuperação excede seu orçamento local.')
  // The wire format has constant depth. Validate its budget before following
  // references, then validate the reconstructed document using the shared guard.
  const wire = copyStudioProjectJson(JSON.parse(text), {
    nodes: limits.nodes * 4,
    textChars: limits.textChars,
    depth: 12,
  })
  if (
    !record(wire) ||
    wire.version !== 1 ||
    Object.keys(wire).some((key) => !['version', 'root', 'nodes'].includes(key)) ||
    !('root' in wire) ||
    !Array.isArray(wire.nodes) ||
    wire.nodes.length > limits.nodes
  )
    throw new Error('Formato de recuperação desconhecido ou inválido.')
  const nodes: unknown[] = wire.nodes
  const copies: Array<unknown[] | Record<string, unknown>> = nodes.map((node) => {
    if (!record(node) || Object.keys(node).length !== 1)
      throw new Error('Container de recuperação inválido.')
    if (Array.isArray(node.array)) return []
    if (Array.isArray(node.object)) return Object.create(null)
    throw new Error('Container de recuperação desconhecido.')
  })
  const ref = (item: unknown): unknown => {
    if (
      item === null ||
      typeof item === 'string' ||
      typeof item === 'boolean' ||
      (typeof item === 'number' && Number.isFinite(item))
    )
      return item
    if (Array.isArray(item)) {
      if (!item.length) return undefined
      if (item.length === 1 && item[0] === -1) return -0
      if (
        item.length === 1 &&
        Number.isSafeInteger(item[0]) &&
        item[0] >= 0 &&
        item[0] < copies.length
      )
        return copies[item[0]]
    }
    throw new Error('Referência de recuperação inválida.')
  }
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    const copy = copies[index]
    if (!record(node) || !copy) throw new Error('Container ausente.')
    if (Array.isArray(copy) && Array.isArray(node.array)) {
      for (const value of node.array) copy.push(ref(value))
    } else if (!Array.isArray(copy) && Array.isArray(node.object)) {
      for (const entry of node.object) {
        if (
          !Array.isArray(entry) ||
          entry.length !== 2 ||
          typeof entry[0] !== 'string' ||
          Object.hasOwn(copy, entry[0])
        )
          throw new Error('Campo de recuperação inválido ou repetido.')
        Object.defineProperty(copy, entry[0], {
          value: ref(entry[1]),
          enumerable: true,
          writable: true,
          configurable: true,
        })
      }
    } else throw new Error('Container de recuperação incompatível.')
  }
  const root = ref(wire.root)
  const reachable = new Set<object>()
  const pending: unknown[] = [root]
  while (pending.length) {
    const item = pending.pop()
    if (!item || typeof item !== 'object' || reachable.has(item)) continue
    reachable.add(item)
    for (const value of Object.values(item)) pending.push(value)
  }
  if (reachable.size !== copies.length)
    throw new Error('A recuperação contém containers sem referência.')
  return copyStudioProjectJson(root, limits)
}
