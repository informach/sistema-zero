/** Self-authored rigged triangle: a joint moves two units in one second. No external assets. */
export function animatedGlb(): Uint8Array {
  const arrays = [
    new Float32Array([5, 3, 0, 7, 3, 0, 5, 5, 0]),
    new Uint16Array(12),
    new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
    new Float32Array([0, 1]),
    new Float32Array([0, 0, 0, 2, 0, 0]),
  ]
  let offset = 0
  const bufferViews = arrays.map((array) => {
    const view = { buffer: 0, byteOffset: offset, byteLength: array.byteLength }
    offset += array.byteLength
    return view
  })
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: 'Rig', children: [1, 2] },
      { name: 'joint0' },
      { name: 'Mesh', mesh: 0, skin: 0 },
    ],
    skins: [{ joints: [1] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] }],
    buffers: [{ byteLength: offset }],
    bufferViews,
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [5, 3, 0],
        max: [7, 5, 0],
      },
      { bufferView: 1, componentType: 5123, count: 3, type: 'VEC4' },
      { bufferView: 2, componentType: 5126, count: 3, type: 'VEC4' },
      { bufferView: 3, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 4, componentType: 5126, count: 2, type: 'VEC3' },
    ],
    animations: [
      {
        name: 'Acenar',
        samplers: [{ input: 3, output: 4, interpolation: 'LINEAR' }],
        channels: [{ sampler: 0, target: { node: 1, path: 'translation' } }],
      },
    ],
  }
  const text = JSON.stringify(json)
  const encoded = new TextEncoder().encode(text.padEnd(Math.ceil(text.length / 4) * 4, ' '))
  const bytes = new Uint8Array(28 + encoded.length + offset)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, bytes.length, true)
  view.setUint32(12, encoded.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(encoded, 20)
  view.setUint32(20 + encoded.length, offset, true)
  view.setUint32(24 + encoded.length, 0x004e4942, true)
  offset = 28 + encoded.length
  for (const array of arrays) {
    bytes.set(new Uint8Array(array.buffer), offset)
    offset += array.byteLength
  }
  return bytes
}
