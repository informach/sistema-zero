/** GLB 2.0 mínimo com um nó e clipes de translação reais. */
export function makeAnimatedGlb(nodeName: string, clipNames: string[] = []): string {
  const gltf: Record<string, unknown> = {
    asset: { version: '2.0' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ name: nodeName, mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  }
  // Triângulo visível + tempos [0,1] + duas translações. Manter tudo em f32
  // deixa os offsets naturalmente alinhados para GLB/GLTFLoader.
  const binaryFloats = new Float32Array([-0.8, 0, 0, 0.8, 0, 0, 0, 1.6, 0, 0, 1, 0, 0, 0, 0, 1, 0])
  gltf.buffers = [{ byteLength: binaryFloats.byteLength }]
  const bufferViews: Array<Record<string, number>> = [{ buffer: 0, byteOffset: 0, byteLength: 36 }]
  const accessors: Array<Record<string, unknown>> = [
    {
      bufferView: 0,
      componentType: 5126,
      count: 3,
      type: 'VEC3',
      min: [-0.8, 0, 0],
      max: [0.8, 1.6, 0],
    },
  ]
  gltf.bufferViews = bufferViews
  gltf.accessors = accessors
  if (clipNames.length) {
    bufferViews.push(
      { buffer: 0, byteOffset: 36, byteLength: 8 },
      { buffer: 0, byteOffset: 44, byteLength: 24 },
    )
    accessors.push(
      { bufferView: 1, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 2, componentType: 5126, count: 2, type: 'VEC3' },
    )
    gltf.animations = clipNames.map((name) => ({
      name,
      samplers: [{ input: 1, interpolation: 'LINEAR', output: 2 }],
      channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
    }))
  }
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const pad = (4 - (json.length % 4)) % 4
  const jsonLength = json.length + pad
  const binaryBytes = new Uint8Array(binaryFloats.buffer)
  const binaryPad = (4 - (binaryBytes.length % 4)) % 4
  const binaryLength = binaryBytes.length + binaryPad
  const total = 12 + 8 + jsonLength + 8 + binaryLength
  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  for (let index = 0; index < pad; index++) bytes[20 + json.length + index] = 0x20
  const binaryOffset = 20 + jsonLength
  view.setUint32(binaryOffset, binaryLength, true)
  view.setUint32(binaryOffset + 4, 0x004e4942, true)
  bytes.set(binaryBytes, binaryOffset + 8)
  let encoded = ''
  for (const byte of bytes) encoded += String.fromCharCode(byte)
  return `data:model/gltf-binary;base64,${btoa(encoded)}`
}

/** Radiance HDR pequeno (7×4, sem RLE) e grande o bastante para PMREM real. */
export function makeHdrDataUrl(red: number, green: number, blue: number): string {
  const width = 7
  const height = 4
  const header = new TextEncoder().encode(
    `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`,
  )
  const bytes = new Uint8Array(header.length + width * height * 4)
  bytes.set(header)
  for (let offset = header.length; offset < bytes.length; offset += 4) {
    bytes.set([red, green, blue, 129], offset)
  }
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:image/vnd.radiance;base64,${btoa(binary)}`
}
