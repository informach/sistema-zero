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

/** Um clipe GLTF real; conserva a geometria e os metadados do exemplo recebido. */
export function comAnimacao(json: ReturnType<typeof exemplo>['j'], bin: Uint8Array) {
  const inicio = Math.ceil(bin.byteLength / 4) * 4,
    dados = new Uint8Array(inicio + 32)
  dados.set(bin)
  dados.set(new Uint8Array(new Float32Array([0, 1]).buffer), inicio)
  dados.set(new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0]).buffer), inicio + 8)
  return {
    bin: dados,
    j: {
      ...structuredClone(json),
      buffers: [{ byteLength: dados.byteLength }],
      bufferViews: [
        ...json.bufferViews,
        { buffer: 0, byteOffset: inicio, byteLength: 8 },
        { buffer: 0, byteOffset: inicio + 8, byteLength: 24 },
      ],
      accessors: [
        ...json.accessors,
        {
          bufferView: json.bufferViews.length,
          componentType: 5126,
          count: 2,
          type: 'SCALAR',
          min: [0],
          max: [1],
        },
        { bufferView: json.bufferViews.length + 1, componentType: 5126, count: 2, type: 'VEC3' },
      ],
      animations: [
        {
          name: 'andar',
          samplers: [
            {
              input: json.accessors.length,
              output: json.accessors.length + 1,
              interpolation: 'LINEAR',
            },
          ],
          channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
        },
      ],
    },
  }
}
