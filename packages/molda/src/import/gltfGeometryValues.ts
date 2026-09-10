import type { GltfAccessor } from './gltfAccessors'
import { GltfInputError } from './gltfInput'
import type { GltfMeshPrimitive } from './gltfMeshes'

/** Prepare only active deltas, once per attribute/primitive, not once per corner. */
export function gltfGeometryValues(
  source: GltfMeshPrimitive,
  accessors: readonly GltfAccessor[],
  name: string,
  weights: readonly number[],
  path: string,
): (component: number) => number {
  const index = source.attributes.get(name)
  const base = index === undefined ? null : accessors[index]!.values
  const deltas: Array<{ values: Float64Array; weight: number }> = []
  source.targets.forEach((target, t) => {
    const accessor = target.get(name),
      weight = weights[t]!
    if (weight !== 0 && accessor !== undefined)
      deltas.push({ values: accessors[accessor]!.values, weight })
  })
  return (component) => {
    let value = base === null ? 0 : base[component]!
    for (const delta of deltas) value += delta.values[component]! * delta.weight
    // Keep authorial doubles. Checking Float32 is not permission to quantize them.
    const draw = Math.fround(value)
    if (!Number.isFinite(value) || !Number.isFinite(draw) || (value !== 0 && draw === 0))
      throw new GltfInputError(
        'unsupported',
        `${path}.${name}`,
        'Um valor da forma não cabe na precisão de desenho do Molda.',
      )
    return value === 0 ? 0 : value
  }
}
