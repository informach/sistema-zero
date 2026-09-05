/**
 * Leitor GLB INDEPENDENTE do escritor, só para os testes: container (header,
 * chunks, alinhamento), JSON, e leitura de acessores/imagens pelo BIN.
 */
export interface GlbChunk {
  type: number
  length: number
  offset: number
}

export interface ParsedGlb {
  totalLength: number
  chunks: GlbChunk[]
  json: Record<string, unknown>
  bin: Uint8Array
}

export const GLB_MAGIC = 0x46546c67
export const GLB_CHUNK_JSON = 0x4e4f534a
export const GLB_CHUNK_BIN = 0x004e4942

export function readGlb(bytes: Uint8Array): ParsedGlb {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error('magic')
  if (view.getUint32(4, true) !== 2) throw new Error('versão')
  const totalLength = view.getUint32(8, true)
  if (totalLength !== bytes.length) throw new Error('tamanho total')
  const chunks: GlbChunk[] = []
  let offset = 12
  let json: Record<string, unknown> | null = null
  let bin: Uint8Array | null = null
  while (offset < bytes.length) {
    const length = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    chunks.push({ type, length, offset })
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    if (type === GLB_CHUNK_JSON)
      json = JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>
    else if (type === GLB_CHUNK_BIN) bin = data
    offset += 8 + length
  }
  if (!json || !bin) throw new Error('chunks')
  return { totalLength, chunks, json, bin }
}

interface Accessor {
  bufferView: number
  componentType: number
  count: number
  type: string
}

interface BufferView {
  byteOffset?: number
  byteLength: number
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

export function readAccessor(
  parsed: ParsedGlb,
  index: number,
): Float32Array | Uint16Array | Uint32Array {
  const accessor = (parsed.json.accessors as Accessor[])[index]
  if (!accessor) throw new Error(`accessor ${index}`)
  const view = (parsed.json.bufferViews as BufferView[])[accessor.bufferView]
  if (!view) throw new Error('bufferView')
  const components = COMPONENTS[accessor.type] ?? 1
  const start = parsed.bin.byteOffset + (view.byteOffset ?? 0)
  const length = accessor.count * components
  switch (accessor.componentType) {
    case 5126:
      return new Float32Array(parsed.bin.buffer.slice(start, start + length * 4))
    case 5123:
      return new Uint16Array(parsed.bin.buffer.slice(start, start + length * 2))
    case 5125:
      return new Uint32Array(parsed.bin.buffer.slice(start, start + length * 4))
    default:
      throw new Error(`componentType ${accessor.componentType}`)
  }
}

export function readImage(parsed: ParsedGlb, index: number): Uint8Array {
  const image = (parsed.json.images as Array<{ bufferView: number }>)[index]
  if (!image) throw new Error(`image ${index}`)
  const view = (parsed.json.bufferViews as BufferView[])[image.bufferView]
  if (!view) throw new Error('bufferView da imagem')
  const start = view.byteOffset ?? 0
  return parsed.bin.slice(start, start + view.byteLength)
}
