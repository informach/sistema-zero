import {
  type GltfAccessorRange,
  type GltfAccessorType,
  type GltfComponent,
  type GltfComponentType,
  type GltfElementLayout,
  gltfAccessorRange,
  gltfElementLayout,
} from './gltfAccessorLayout'
import type { GltfBufferRead } from './gltfBuffers'
import {
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfList,
  gltfRecord,
  requireGltf,
} from './gltfInput'

export interface GltfAccessor {
  componentType: GltfComponentType
  type: GltfAccessorType
  count: number
  normalized: boolean
  values: Float64Array
  /** Raw component bounds, before normalized conversion. */
  min: number[] | null
  max: number[] | null
  /** Retained for semantic usage checks (vertex/index/animation/skin), not a source view. */
  layout: Pick<GltfAccessorRange, 'bufferView' | 'byteOffset' | 'byteStride' | 'target'> | null
  /** Sparse storage is also numeric data and cannot share a bufferView with an image. */
  sparseViews: { indices: number; values: number } | null
}
type Resources = Extract<GltfBufferRead, { status: 'ready' }>
interface SparsePlan {
  count: number
  indices: GltfAccessorRange
  indexLayout: GltfElementLayout
  values: GltfAccessorRange
}
interface AccessorPlan {
  path: string
  count: number
  layout: GltfElementLayout
  normalized: boolean
  base: GltfAccessorRange | null
  sparse: SparsePlan | null
  min: number[] | null
  max: number[] | null
}

function bound(
  input: unknown,
  components: number,
  component: GltfComponent,
  path: string,
): number[] | null {
  if (input === undefined) return null
  const values = gltfList(input, path, 16)
  requireGltf(
    values.length === components,
    path,
    'A quantidade de limites não corresponde aos componentes do accessor.',
  )
  return values.map((value) => {
    requireGltf(
      typeof value === 'number' && Number.isFinite(value),
      path,
      'Os limites precisam ser números finitos.',
    )
    if (component.type === 5126) {
      const rounded = Math.fround(value)
      requireGltf(Number.isFinite(rounded), path, 'O limite não cabe em Float32.')
      return rounded
    }
    return gltfInteger(value, path, component.min, component.max)
  })
}

function prepare(input: unknown, index: number, resources: Resources): AccessorPlan {
  const path = `accessors[${index}]`,
    row = gltfRecord(input, path)
  const layout = gltfElementLayout(row.componentType, row.type, path)
  const count = gltfInteger(row.count, `${path}.count`, 1)
  if (count > GLTF_INPUT_LIMITS.accessorValues / layout.offsets.length)
    throw new GltfInputError(
      'budget',
      path,
      'Este accessor tem valores demais para abrir no Molda.',
    )
  const normalized = row.normalized === undefined ? false : row.normalized
  requireGltf(
    typeof normalized === 'boolean',
    `${path}.normalized`,
    'A normalização precisa ser verdadeira ou falsa.',
  )
  requireGltf(
    !normalized || (layout.component.type !== 5125 && layout.component.type !== 5126),
    `${path}.normalized`,
    'Este tipo numérico não permite normalização.',
  )
  let base: GltfAccessorRange | null = null
  if (row.bufferView === undefined)
    requireGltf(
      row.byteOffset === undefined,
      path,
      'Um accessor sem bufferView não pode declarar byteOffset.',
    )
  else
    base = gltfAccessorRange(
      row.bufferView,
      row.byteOffset,
      count,
      layout,
      resources.buffers,
      resources.views,
      path,
    )
  let sparse: SparsePlan | null = null
  if (row.sparse !== undefined) {
    const data = gltfRecord(row.sparse, `${path}.sparse`)
    const sparseCount = gltfInteger(data.count, `${path}.sparse.count`, 1, count)
    const indices = gltfRecord(data.indices, `${path}.sparse.indices`),
      values = gltfRecord(data.values, `${path}.sparse.values`)
    requireGltf(
      indices.componentType === 5121 ||
        indices.componentType === 5123 ||
        indices.componentType === 5125,
      `${path}.sparse.indices.componentType`,
      'Índices sparse precisam ser inteiros sem sinal.',
    )
    const indexLayout = gltfElementLayout(indices.componentType, 'SCALAR', `${path}.sparse.indices`)
    sparse = {
      count: sparseCount,
      indexLayout,
      indices: gltfAccessorRange(
        indices.bufferView,
        indices.byteOffset,
        sparseCount,
        indexLayout,
        resources.buffers,
        resources.views,
        `${path}.sparse.indices`,
        true,
      ),
      values: gltfAccessorRange(
        values.bufferView,
        values.byteOffset,
        sparseCount,
        layout,
        resources.buffers,
        resources.views,
        `${path}.sparse.values`,
        true,
      ),
    }
  }
  return {
    path,
    count,
    layout,
    normalized,
    base,
    sparse,
    min: bound(row.min, layout.offsets.length, layout.component, `${path}.min`),
    max: bound(row.max, layout.offsets.length, layout.component, `${path}.max`),
  }
}

function readElement(
  plan: AccessorPlan,
  range: GltfAccessorRange,
  element: number,
  out: Float64Array,
  destination: number,
): void {
  const { offsets, component } = plan.layout
  const start = range.start + element * range.stride
  for (let c = 0; c < offsets.length; c++) {
    const value = component.read(range.data, start + offsets[c]!)
    requireGltf(
      Number.isFinite(value),
      plan.path,
      'O accessor contém um valor infinito ou indefinido.',
    )
    out[destination * offsets.length + c] = value
  }
}

function decode(plan: AccessorPlan): GltfAccessor {
  const components = plan.layout.offsets.length
  const values = new Float64Array(plan.count * components)
  if (plan.base) for (let i = 0; i < plan.count; i++) readElement(plan, plan.base, i, values, i)
  if (plan.sparse) {
    const { indices, indexLayout, count } = plan.sparse
    let previous = -1
    for (let i = 0; i < count; i++) {
      const index = indexLayout.component.read(indices.data, indices.start + i * indices.stride)
      requireGltf(
        index > previous && index < plan.count,
        `${plan.path}.sparse.indices`,
        'Os índices sparse precisam crescer sem repetição e caber no accessor.',
      )
      readElement(plan, plan.sparse.values, i, values, index)
      previous = index
    }
  }
  if ((plan.base || plan.sparse) && (plan.min || plan.max)) {
    for (let c = 0; c < components; c++) {
      let min = Infinity,
        max = -Infinity
      for (let i = c; i < values.length; i += components) {
        min = Math.min(min, values[i]!)
        max = Math.max(max, values[i]!)
      }
      requireGltf(
        (plan.min === null || plan.min[c] === min) && (plan.max === null || plan.max[c] === max),
        plan.path,
        'Os limites declarados não correspondem aos valores do accessor.',
      )
    }
  }
  if (plan.normalized) {
    const component = plan.layout.component
    for (let i = 0; i < values.length; i++)
      values[i] = Math.max(values[i]! / component.max, component.min < 0 ? -1 : 0)
  }
  const base = plan.base
  return {
    componentType: plan.layout.component.type,
    type: plan.layout.type,
    count: plan.count,
    normalized: plan.normalized,
    values,
    min: plan.min,
    max: plan.max,
    sparseViews: plan.sparse
      ? { indices: plan.sparse.indices.bufferView, values: plan.sparse.values.bufferView }
      : null,
    layout: base
      ? {
          bufferView: base.bufferView,
          byteOffset: base.byteOffset,
          byteStride: base.byteStride,
          target: base.target,
        }
      : null,
  }
}

/** Typed values, not validated mesh/animation semantics. No extension is executed. */
export function readGltfAccessors(input: unknown, resources: Resources): GltfAccessor[] {
  const plans = gltfList(input, 'accessors', GLTF_INPUT_LIMITS.accessors).map((row, i) =>
    prepare(row, i, resources),
  )
  let total = 0
  for (const plan of plans) {
    total += plan.count * plan.layout.offsets.length
    if (total > GLTF_INPUT_LIMITS.accessorValues)
      throw new GltfInputError(
        'budget',
        'accessors',
        'Os valores decodificados ultrapassam o limite de memória do Molda.',
      )
  }
  return plans.map(decode)
}
