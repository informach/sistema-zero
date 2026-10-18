/** Structural budget before any recursive schema/parser sees untrusted project data. */
export const STUDIO_PROJECT_JSON_LIMITS = Object.freeze({
  nodes: 500_000,
  textChars: 128_000_000,
  // Existing Blockly chains can have four nested containers per block (10,000 blocks).
  depth: 40_064,
})

export class StudioProjectJsonError extends Error {
  constructor(
    readonly code: 'invalid-json' | 'json-budget',
    message: string,
  ) {
    super(message)
    this.name = 'StudioProjectJsonError'
  }
}

/**
 * Iterative copy: no getter/toJSON calls, recursion, lossy stringify or prototype setters.
 * Undefined object fields are kept for IndexedDB compatibility; arrays must be dense JSON.
 */
export function copyStudioProjectJson(
  input: unknown,
  limits: { nodes: number; textChars: number; depth: number } = STUDIO_PROJECT_JSON_LIMITS,
): unknown {
  const holder: Record<string, unknown> = {}
  type Container = Record<string, unknown> | unknown[]
  type Work = { value: unknown; target: Container; key: string; depth: number } | { leave: object }
  const pending: Work[] = [{ value: input, target: holder, key: 'value', depth: 0 }]
  const ancestors = new Set<object>()
  let reservedNodes = 1
  let textChars = 0
  function fail(message: string): never {
    throw new StudioProjectJsonError('invalid-json', message)
  }
  function budget(): never {
    throw new StudioProjectJsonError('json-budget', 'O projeto excede o limite de complexidade.')
  }
  while (pending.length) {
    const work = pending.pop()!
    if ('leave' in work) {
      ancestors.delete(work.leave)
      continue
    }
    const { value, target, key, depth } = work
    if (depth > limits.depth) budget()
    if (typeof value === 'string') textChars += value.length
    if (textChars > limits.textChars) budget()
    const set = (copy: unknown) =>
      Object.defineProperty(target, key, {
        value: copy,
        enumerable: true,
        writable: true,
        configurable: true,
      })
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      (value === undefined && !Array.isArray(target))
    ) {
      set(value)
      continue
    }
    if (!value || typeof value !== 'object') fail('O projeto contém um valor que não é JSON.')
    const prototype = Object.getPrototypeOf(value)
    const array = Array.isArray(value)
    if (
      array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null
    )
      fail('O projeto contém uma instância que não é JSON.')
    if (ancestors.has(value)) fail('O projeto contém uma referência circular.')
    const keys = Object.keys(value)
    reservedNodes += keys.length
    if (reservedNodes > limits.nodes || (array && value.length > limits.nodes)) budget()
    if (
      array &&
      (keys.length !== value.length || keys.some((item, index) => item !== String(index)))
    )
      fail('Uma lista do projeto contém posições ausentes ou propriedades extras.')
    const copy: Container = array ? new Array(value.length) : {}
    set(copy)
    ancestors.add(value)
    pending.push({ leave: value })
    for (let index = keys.length - 1; index >= 0; index--) {
      const childKey = keys[index]!
      const descriptor = Object.getOwnPropertyDescriptor(value, childKey)
      if (!descriptor || !('value' in descriptor))
        fail('O projeto contém uma propriedade executável.')
      textChars += childKey.length
      if (textChars > limits.textChars) budget()
      pending.push({ value: descriptor.value, target: copy, key: childKey, depth: depth + 1 })
    }
  }
  return holder.value
}
