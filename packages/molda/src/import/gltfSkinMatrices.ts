import type { GltfAccessor } from './gltfAccessors'
import { gltfInteger, requireGltf } from './gltfInput'
import type { GltfMeshViewUse } from './gltfMeshAttributes'

/** Retain the accessor reference, not another copy of the already-owned matrix values. */
export function readGltfSkinMatrices(
  input: unknown,
  joints: number,
  accessors: readonly GltfAccessor[],
  meshUses: ReadonlyMap<number, GltfMeshViewUse>,
  checked: Set<number>,
  path: string,
): number | null {
  if (input === undefined) return null
  const index = gltfInteger(input, path, 0, accessors.length - 1),
    accessor = accessors[index]!
  requireGltf(accessor.count >= joints, path, 'Faltam matrizes para as juntas deste esqueleto.')
  if (checked.has(index)) return index
  requireGltf(
    accessor.type === 'MAT4' && accessor.componentType === 5126 && !accessor.normalized,
    path,
    'As matrizes de vínculo precisam ser MAT4 com componentes Float32.',
  )
  if (accessor.layout)
    requireGltf(
      accessor.layout.byteStride === null &&
        accessor.layout.target === null &&
        !meshUses.has(accessor.layout.bufferView),
      path,
      'Matrizes de vínculo não podem compartilhar bufferView de malha nem usar target/stride.',
    )
  for (let at = 0; at < accessor.values.length; at += 16)
    requireGltf(
      accessor.values[at + 3] === 0 &&
        accessor.values[at + 7] === 0 &&
        accessor.values[at + 11] === 0 &&
        accessor.values[at + 15] === 1,
      path,
      'A última linha da matriz de vínculo precisa ser [0, 0, 0, 1].',
    )
  checked.add(index)
  return index
}
