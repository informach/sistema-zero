import type { GltfAnimationSources, GltfInterpolation } from './gltfAnimationTypes'
import { GLTF_INPUT_LIMITS, GltfInputError, requireGltf } from './gltfInput'

/** Per-read index; no values are touched until all metadata and work budgets pass. */
export function planGltfAnimationValues(source: GltfAnimationSources) {
  const { accessors, meshes, skins, meshUses } = source
  const forbidden = new Set<number>(),
    forbiddenViews = new Set(meshUses.keys()),
    roles = new Map<number, 'input' | 'output'>(),
    times = new Map<number, string>(),
    rotations = new Map<string, { index: number; cubic: boolean; path: string }>()
  let values = 0
  for (const mesh of meshes)
    for (const primitive of mesh.primitives) {
      for (const index of primitive.attributes.values()) forbidden.add(index)
      for (const target of primitive.targets)
        for (const index of target.values()) forbidden.add(index)
      if (primitive.indicesAccessor !== null) forbidden.add(primitive.indicesAccessor)
    }
  for (const skin of skins)
    if (skin.inverseBindMatrices !== null) {
      forbidden.add(skin.inverseBindMatrices)
      const layout = accessors[skin.inverseBindMatrices]!.layout
      if (layout) forbiddenViews.add(layout.bufferView)
    }
  const spend = (amount: number, path: string) => {
    values += amount
    if (values > GLTF_INPUT_LIMITS.animationValues)
      throw new GltfInputError('budget', path, 'Há valores de animação demais para conferir.')
  }
  return {
    accessor(index: number, role: 'input' | 'output', path: string) {
      const accessor = accessors[index]!,
        previous = roles.get(index)
      requireGltf(
        !forbidden.has(index) && (previous === undefined || previous === role),
        path,
        'Este accessor mistura papéis incompatíveis com animação.',
      )
      if (previous !== undefined) return accessor
      const layout = accessor.layout
      if (layout)
        requireGltf(
          layout.target === null &&
            layout.byteStride === null &&
            !forbiddenViews.has(layout.bufferView),
          path,
          'Animação não pode usar target/stride nem bufferView de malha ou vínculo.',
        )
      roles.set(index, role)
      if (role === 'input') {
        requireGltf(
          accessor.type === 'SCALAR' && accessor.componentType === 5126 && !accessor.normalized,
          path,
          'Os tempos precisam ser SCALAR/Float32.',
        )
        requireGltf(accessor.min && accessor.max, path, 'Faltam min/max dos tempos.')
        spend(accessor.count, path)
        times.set(index, path)
      }
      return accessor
    },
    rotation(index: number, interpolation: GltfInterpolation, path: string) {
      const cubic = interpolation === 'CUBICSPLINE',
        key = `${index}:${cubic}`
      if (rotations.has(key)) return
      spend((accessors[index]!.count / (cubic ? 3 : 1)) * 4, path)
      rotations.set(key, { index, cubic, path })
    },
    read() {
      for (const [index, path] of times) {
        const data = accessors[index]!.values
        let previous = -1
        for (const value of data) {
          requireGltf(
            value >= 0 && value > previous,
            path,
            'Os tempos precisam ser não negativos e estritamente crescentes.',
          )
          previous = value
        }
      }
      for (const { index, cubic, path } of rotations.values()) {
        const data = accessors[index]!.values
        for (let at = cubic ? 4 : 0; at < data.length; at += cubic ? 12 : 4)
          requireGltf(
            Math.abs(Math.hypot(data[at]!, data[at + 1]!, data[at + 2]!, data[at + 3]!) - 1) <=
              0.00769,
            path,
            'As chaves de rotação precisam de quaternions unitários.',
          )
        // Khronos' tolerance includes signed 8-bit quantization. No normalization;
        // a later native conversion must explicitly handle its tighter contract.
      }
    },
  }
}
