/** A GLB owns one allocation; input segments are copied, never transferred or mutated. */
export function glbAlignedLength(length: number): number {
  return length + ((4 - (length % 4)) % 4)
}

export function encodeGlbContainer(
  json: object,
  segments: readonly Uint8Array[],
  maximumBytes = 0xffff_ffff,
): Uint8Array<ArrayBuffer> {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json))
  const jsonLength = glbAlignedLength(jsonBytes.length)
  const binLength = segments.reduce((sum, part) => sum + glbAlignedLength(part.byteLength), 0)
  const total = 20 + jsonLength + (binLength ? 8 + binLength : 0)
  if (!Number.isSafeInteger(total) || total > maximumBytes || total > 0xffff_ffff)
    throw new RangeError('O arquivo GLB ultrapassa o tamanho permitido.')
  const out = new Uint8Array(total)
  const header = new DataView(out.buffer)
  header.setUint32(0, 0x46546c67, true)
  header.setUint32(4, 2, true)
  header.setUint32(8, total, true)
  header.setUint32(12, jsonLength, true)
  header.setUint32(16, 0x4e4f534a, true)
  out.fill(0x20, 20, 20 + jsonLength)
  out.set(jsonBytes, 20)
  if (binLength) {
    const start = 20 + jsonLength
    header.setUint32(start, binLength, true)
    header.setUint32(start + 4, 0x004e4942, true)
    let offset = start + 8
    for (const segment of segments) {
      out.set(segment, offset)
      offset += glbAlignedLength(segment.byteLength)
    }
  }
  return out
}
