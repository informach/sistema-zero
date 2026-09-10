import { readGlb } from './glbRead'

/**
 * Independent byte-level V reflection for fixed encoder goldens with invariant image rows.
 * Not an image/material converter or an external GLB reader; all non-UV bytes stay untouched.
 */
export function reflectFixtureGlbV(bytes: Uint8Array): Uint8Array {
  const output = new Uint8Array(bytes),
    parsed = readGlb(output),
    meshes = parsed.json.meshes as Array<{
      primitives: Array<{ attributes: { TEXCOORD_0: number } }>
    }>,
    accessors = parsed.json.accessors as Array<{
      bufferView: number
      componentType: number
      type: string
      count: number
      byteOffset?: number
    }>,
    views = parsed.json.bufferViews as Array<{ byteOffset?: number; byteStride?: number }>,
    data = new DataView(parsed.bin.buffer, parsed.bin.byteOffset, parsed.bin.byteLength),
    uvIndices = new Set(
      meshes.flatMap((mesh) => mesh.primitives.map((primitive) => primitive.attributes.TEXCOORD_0)),
    )
  for (const index of uvIndices) {
    const accessor = accessors[index]!,
      view = views[accessor.bufferView]!
    if (accessor.componentType !== 5126 || accessor.type !== 'VEC2')
      throw new Error('Expected Float32 UV fixture')
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
      stride = view.byteStride ?? 8
    for (let i = 0; i < accessor.count; i++) {
      const offset = start + i * stride + 4
      data.setFloat32(offset, 1 - data.getFloat32(offset, true), true)
    }
  }
  return output
}
