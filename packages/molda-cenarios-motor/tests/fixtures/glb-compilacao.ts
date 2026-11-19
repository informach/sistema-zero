export function exemplo(vertices = 3) {
  const bin = new Uint8Array(vertices * 12)
  const j = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: vertices,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [0, 0, 0],
      },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0 }, { mesh: 0 }],
    scenes: [{ nodes: [0, 1] }],
    scene: 0,
  }
  return { j, bin }
}
export function glb(json: unknown, bin: Uint8Array) {
  const texto = new TextEncoder().encode(JSON.stringify(json)),
    n = Math.ceil(texto.length / 4) * 4,
    dados = new Uint8Array(28 + n + Math.ceil(bin.length / 4) * 4),
    v = new DataView(dados.buffer)
  v.setUint32(0, 0x46546c67, true)
  v.setUint32(4, 2, true)
  v.setUint32(8, dados.length, true)
  v.setUint32(12, n, true)
  v.setUint32(16, 0x4e4f534a, true)
  dados.fill(32, 20, 20 + n)
  dados.set(texto, 20)
  v.setUint32(20 + n, dados.length - 28 - n, true)
  v.setUint32(24 + n, 0x004e4942, true)
  dados.set(bin, 28 + n)
  return dados
}
