import { PINTA_REGION_LIMITS } from '@sistemazero/core/creations'
import { PINTA_RESOURCE_LIMITS } from './projectConfig'

/** Read/write work budget for the new native region document, independent of its cell buffers. */
export const REGION_METADATA_BUDGET = Object.freeze({
  maxNodes: 500_000,
  maxDepth: 64,
  maxBinaryBytes: PINTA_RESOURCE_LIMITS.maxSnapshotBytes,
  maxStringUnits: PINTA_RESOURCE_LIMITS.maxSnapshotBytes,
})

type Budget = { [Key in keyof typeof REGION_METADATA_BUDGET]: number }
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype)
const typedLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'length')?.get
const typedBytes = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength')?.get

function sequenceLength(value: unknown): number | null {
  if (Array.isArray(value)) return value.length
  if (!ArrayBuffer.isView(value) || !typedLength) return null
  const length: unknown = typedLength.call(value)
  return typeof length === 'number' && Number.isSafeInteger(length) ? length : null
}

function dataValue(value: object, key: string): PropertyDescriptor | null {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor && 'value' in descriptor ? descriptor : null
}

function recordKeys(value: object): string[] | null {
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== null && prototype !== Object.prototype) return null
  const keys: string[] = []
  for (const key of Object.keys(value)) {
    const descriptor = dataValue(value, key)
    if (!descriptor) return null
    // Optional memory fields have the same representation as their absent JSON fields.
    if (descriptor.value !== undefined) keys.push(key)
  }
  return keys
}

/** Strip only tile payloads, retaining the identities of immutable authorial subtrees. */
export function regionDocumentMetadata(value: unknown): object | null {
  try {
    function record(input: unknown, omit: string): Record<string, unknown> | null {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return null
      const prototype = Object.getPrototypeOf(input)
      if (prototype !== null && prototype !== Object.prototype) return null
      const result: Record<string, unknown> = Object.create(null)
      for (const key of Object.keys(input)) {
        if (key === omit) continue
        const descriptor = dataValue(input, key)
        if (!descriptor) return null
        result[key] = descriptor.value
      }
      return result
    }
    function map(input: unknown): object | null {
      const result = record(input, 'layers')
      if (!result || !input || typeof input !== 'object') return null
      const layers = dataValue(input, 'layers')?.value
      if (!Array.isArray(layers) || layers.length > PINTA_REGION_LIMITS.maxLayers) return null
      const headers: unknown[] = []
      for (let i = 0; i < layers.length; i++) {
        const layer = dataValue(layers, String(i))?.value
        if (!layer || typeof layer !== 'object' || Array.isArray(layer)) return null
        const kind = dataValue(layer, 'kind')
        if (Object.hasOwn(layer, 'kind') && !kind) return null
        if (kind?.value === undefined || kind.value === 'tiles') {
          const header = record(layer, 'cells')
          if (!header) return null
          headers.push(header)
        } else headers.push(layer)
      }
      result.layers = headers
      return result
    }
    if (!value || typeof value !== 'object') return null
    if (dataValue(value, 'kind')?.value !== 'map-set') return map(value)
    const result = record(value, 'map')
    const inner = map(dataValue(value, 'map')?.value)
    if (!result || !inner) return null
    result.map = inner
    return result
  } catch {
    return null
  }
}

type MetadataSize = { nodes: number; depth: number; binaryBytes: number; stringUnits: number }

/** Per-editor cache for canonical immutable revisions, never for untrusted/mutable wire data.
 * Summaries contain numbers only. Repeated references still count at every occurrence.
 * This measures metadata; semantic validation and chunk admission remain separate contracts.
 */
export class RegionMetadataBudgetCache {
  private readonly sizes = new WeakMap<object, MetadataSize>()

  accepts(value: unknown, lowerBudget: Partial<Budget> = {}): boolean {
    const budget = { ...REGION_METADATA_BUDGET, ...lowerBudget }
    for (const key of Object.keys(REGION_METADATA_BUDGET) as Array<keyof Budget>)
      if (
        !Number.isSafeInteger(budget[key]) ||
        budget[key] < 1 ||
        budget[key] > REGION_METADATA_BUDGET[key]
      )
        return false
    const ancestors = new WeakSet<object>()
    const within = (size: MetadataSize) =>
      size.nodes <= budget.maxNodes &&
      size.depth <= budget.maxDepth &&
      size.binaryBytes <= budget.maxBinaryBytes &&
      size.stringUnits <= budget.maxStringUnits
    const measure = (input: unknown, level = 0): MetadataSize | null => {
      if (level > budget.maxDepth) return null
      const size: MetadataSize = { nodes: 1, depth: 0, binaryBytes: 0, stringUnits: 0 }
      if (
        input === null ||
        typeof input === 'boolean' ||
        (typeof input === 'number' && Number.isFinite(input))
      )
        return size
      if (typeof input === 'string') {
        size.stringUnits = input.length
        return within(size) ? size : null
      }
      if (!input || typeof input !== 'object' || ancestors.has(input)) return null
      const cached = this.sizes.get(input)
      if (cached) return within(cached) && cached.depth + level <= budget.maxDepth ? cached : null
      if (ArrayBuffer.isView(input)) {
        // Canonical bitmap buffers are bytes; other views are not authorial metadata.
        if (!(input instanceof Uint8Array) || !typedBytes) return null
        size.binaryBytes = typedBytes.call(input)
      } else {
        ancestors.add(input)
        const keys = Array.isArray(input) ? null : recordKeys(input)
        if (!Array.isArray(input) && !keys) return null
        const length = Array.isArray(input) ? input.length : keys!.length
        if (length + 1 > budget.maxNodes) return null
        for (let i = 0; i < length; i++) {
          const key = keys ? keys[i]! : String(i)
          const descriptor = dataValue(input, key)
          if (!descriptor) return null
          const child = measure(descriptor.value, level + 1)
          if (!child) return null
          size.nodes += child.nodes
          size.depth = Math.max(size.depth, child.depth + 1)
          size.binaryBytes += child.binaryBytes
          size.stringUnits += child.stringUnits + (keys ? key.length : 0)
          if (!within(size)) return null
        }
        ancestors.delete(input)
      }
      if (!within(size)) return null
      this.sizes.set(input, size)
      return size
    }
    try {
      return measure(value) !== null
    } catch {
      return false
    }
  }
}

/**
 * Compare authorial metadata with its validated result, never silently dropping a field.
 * Wire arrays and typed bitmap buffers have the same JSON values. No getters execute.
 * Cell chunks are validated separately; callers compare only the map's metadata here.
 */
export function sameMapDocumentMetadata(
  original: unknown,
  validated: unknown,
  lowerBudget: Partial<Budget> = {},
): boolean {
  try {
    const budget = { ...REGION_METADATA_BUDGET, ...lowerBudget }
    for (const key of Object.keys(REGION_METADATA_BUDGET) as Array<keyof Budget>)
      if (
        !Number.isSafeInteger(budget[key]) ||
        budget[key] < 1 ||
        budget[key] > REGION_METADATA_BUDGET[key]
      )
        return false
    const pending = [{ a: original, b: validated, depth: 0 }]
    let nodes = 1,
      binaryBytes = 0,
      stringUnits = 0
    function enqueue(a: unknown, b: unknown, depth: number): boolean {
      if (++nodes > budget.maxNodes || depth > budget.maxDepth) return false
      pending.push({ a, b, depth })
      return true
    }
    while (pending.length) {
      const { a, b, depth } = pending.pop()!
      if (a === null || b === null) {
        if (a !== b) return false
        continue
      }
      if (typeof a === 'number' || typeof b === 'number') {
        if (
          typeof a !== 'number' ||
          typeof b !== 'number' ||
          !Number.isFinite(a) ||
          !Number.isFinite(b) ||
          a !== b
        )
          return false
        continue
      }
      if (typeof a === 'string' || typeof b === 'string') {
        if (typeof a !== 'string' || typeof b !== 'string' || a !== b) return false
        stringUnits += a.length
        if (stringUnits > budget.maxStringUnits) return false
        continue
      }
      if (typeof a === 'boolean' || typeof b === 'boolean') {
        if (a !== b) return false
        continue
      }
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
      if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
        const length = sequenceLength(a)
        if (length === null || length !== sequenceLength(b) || !typedBytes) return false
        const aBytes = ArrayBuffer.isView(a) ? typedBytes.call(a) : 0
        const bBytes = ArrayBuffer.isView(b) ? typedBytes.call(b) : 0
        binaryBytes += Math.max(aBytes, bBytes)
        if (binaryBytes > budget.maxBinaryBytes) return false
        for (let index = 0; index < length; index++) {
          const x = dataValue(a, String(index)),
            y = dataValue(b, String(index))
          if (
            !x ||
            !y ||
            typeof x.value !== 'number' ||
            typeof y.value !== 'number' ||
            !Number.isFinite(x.value) ||
            x.value !== y.value
          )
            return false
        }
        continue
      }
      if (Array.isArray(a) || Array.isArray(b)) {
        if (
          !Array.isArray(a) ||
          !Array.isArray(b) ||
          a.length !== b.length ||
          nodes + a.length > budget.maxNodes
        )
          return false
        for (let index = 0; index < a.length; index++) {
          const x = dataValue(a, String(index)),
            y = dataValue(b, String(index))
          if (!x || !y || !enqueue(x.value, y.value, depth + 1)) return false
        }
        continue
      }
      const x = recordKeys(a),
        y = recordKeys(b)
      if (!x || !y || x.length !== y.length || nodes + x.length > budget.maxNodes) return false
      const otherKeys = new Set(y)
      for (const key of x) {
        if (!otherKeys.has(key)) return false
        stringUnits += key.length
        if (
          stringUnits > budget.maxStringUnits ||
          !enqueue(dataValue(a, key)!.value, dataValue(b, key)!.value, depth + 1)
        )
          return false
      }
    }
    return true
  } catch {
    return false
  }
}
