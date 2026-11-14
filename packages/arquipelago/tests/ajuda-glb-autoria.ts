import { BoxGeometry } from 'three'

/** GLB válido em memória, sem arquivos privados ou arte retirada. Exercita o parser real. */
export async function glbDeAutoria(
  materialNames: readonly string[] = ['criada'],
): Promise<Uint8Array<ArrayBuffer>> {
  const geometry = new BoxGeometry(1, 1, 1)
  const attributes = [
    geometry.getAttribute('position'),
    geometry.getAttribute('normal'),
    geometry.getAttribute('uv'),
  ]
  const arrays = [...attributes.map((attribute) => attribute.array), geometry.index!.array]
  let byteLength = 0
  const views = arrays.map((array) => {
    const offset = byteLength
    byteLength += Math.ceil(array.byteLength / 4) * 4
    return { buffer: 0, byteOffset: offset, byteLength: array.byteLength }
  })
  const binary = new Uint8Array(byteLength)
  arrays.forEach((array, index) => {
    binary.set(
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength),
      views[index]!.byteOffset,
    )
  })
  const accessors = [
    {
      bufferView: 0,
      componentType: 5126,
      count: attributes[0]!.count,
      type: 'VEC3',
      min: [-0.5, -0.5, -0.5],
      max: [0.5, 0.5, 0.5],
    },
    { bufferView: 1, componentType: 5126, count: attributes[1]!.count, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: attributes[2]!.count, type: 'VEC2' },
    {
      bufferView: 3,
      componentType: geometry.index!.array instanceof Uint32Array ? 5125 : 5123,
      count: geometry.index!.count,
      type: 'SCALAR',
    },
  ]
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'criacao', mesh: 0 }],
    meshes: [
      {
        primitives: materialNames.map((_name, index) => ({
          attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
          indices: 3,
          material: index,
        })),
      },
    ],
    materials: materialNames.map((name) => ({
      name,
      pbrMetallicRoughness: {
        baseColorFactor: [0.3, 0.6, 0.9, 1],
        metallicFactor: 0,
        roughnessFactor: 1,
      },
    })),
    buffers: [{ byteLength }],
    bufferViews: views,
    accessors,
  }
  const text = new TextEncoder().encode(JSON.stringify(json))
  const jsonSize = Math.ceil(text.length / 4) * 4
  const out = new Uint8Array(12 + 8 + jsonSize + 8 + byteLength)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, out.length, true)
  view.setUint32(12, jsonSize, true)
  view.setUint32(16, 0x4e4f534a, true)
  out.fill(32, 20, 20 + jsonSize)
  out.set(text, 20)
  view.setUint32(20 + jsonSize, byteLength, true)
  view.setUint32(24 + jsonSize, 0x004e4942, true)
  out.set(binary, 28 + jsonSize)
  geometry.dispose()
  return out
}
