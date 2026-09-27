/** Test-only framing tools; JPEG entropy is produced by libvips in the tests. */
export function joinJpegBytes(parts: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}

export function jpegSegment(code: number, data: Uint8Array): Uint8Array {
  if (data.length > 65533) throw new Error('Fixture segment too large')
  return joinJpegBytes([
    Uint8Array.of(255, code, (data.length + 2) >> 8, (data.length + 2) & 255),
    data,
  ])
}

export function jpegHeader(bytes: Uint8Array) {
  const parts: { code: number; start: number; end: number; data: Uint8Array }[] = []
  for (let at = 2; at + 3 < bytes.length; ) {
    const code = bytes[at + 1]!,
      end = at + 2 + bytes[at + 2]! * 256 + bytes[at + 3]!
    if (bytes[at] !== 255 || end > bytes.length) throw new Error('Invalid fixture header')
    parts.push({ code, start: at, end, data: bytes.subarray(at + 4, end) })
    if (code === 0xda) return parts
    at = end
  }
  throw new Error('Missing fixture scan')
}

export function editJpegSegment(
  bytes: Uint8Array,
  code: number,
  edit: (data: Uint8Array) => Uint8Array,
  newCode = code,
) {
  const part = jpegHeader(bytes).find((item) => item.code === code)
  if (!part) throw new Error('Missing fixture segment')
  return joinJpegBytes([
    bytes.subarray(0, part.start),
    jpegSegment(newCode, edit(new Uint8Array(part.data))),
    bytes.subarray(part.end),
  ])
}

export function prependJpegSegments(bytes: Uint8Array, parts: readonly Uint8Array[]) {
  return joinJpegBytes([bytes.subarray(0, 2), ...parts, bytes.subarray(2)])
}
