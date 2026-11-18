import { expect, test } from 'bun:test'
import { readGltfEnvelope } from '../import/gltfEnvelope'
import { readGltfResources } from '../import/gltfResources'
import { inspectReferenceRaster } from '../import/rasterHeader'
import { encodeGlbContainer } from './glbContainer'
import { normalizeGlbImagePadding } from './glbImagePadding'

// Generated 2x2 RGBA image, no third-party art. Its 97 bytes require three BIN alignment bytes.
const png = new Uint8Array(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4AWL6z8DwHwSZGEEkw38GAAAAAP//4+5legAAAAZJREFUAwBBDwb/5c5bAAAAAABJRU5ErkJggg==',
    'base64',
  ),
)
function fixture(padding = 3, value = 0) {
  const next = Math.ceil((png.length + padding) / 4) * 4,
    bin = new Uint8Array(next + 4)
  bin.set(png)
  bin.fill(value, png.length, png.length + padding)
  new DataView(bin.buffer).setFloat32(next, 42, true)
  return encodeGlbContainer(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: bin.length }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: png.length + padding },
        { buffer: 0, byteOffset: next, byteLength: 4 },
      ],
      images: [{ bufferView: 0, mimeType: 'image/png' }],
    },
    [bin],
  )
}
test('only zero alignment is excluded from image length; BIN offsets and caller bytes remain intact', () => {
  for (let padding = 0; padding <= 3; padding++) {
    const source = fixture(padding),
      before = source.slice(),
      result = normalizeGlbImagePadding(source),
      original = readGltfEnvelope(source),
      normalized = readGltfEnvelope(result),
      resources = readGltfResources(normalized)
    expect(resources.status).toBe('ready')
    if (resources.status !== 'ready') throw Error('Missing image')
    expect(inspectReferenceRaster(resources.images[0]!.bytes)).toEqual({
      width: 2,
      height: 2,
      mime: 'image/png',
    })
    expect(resources.images[0]!.bytes).toEqual(png)
    expect(normalized.bin).toEqual(original.bin)
    expect((normalized.json.bufferViews as Array<{ byteOffset: number }>)[1]!.byteOffset).toBe(
      (original.json.bufferViews as Array<{ byteOffset: number }>)[1]!.byteOffset,
    )
    expect(source).toEqual(before)
    expect(normalizeGlbImagePadding(result)).toEqual(result)
  }
})
test('nonzero trailing content and padding longer than BIN alignment are not silently removed', () => {
  for (const bytes of [fixture(3, 1), fixture(4)]) {
    const result = normalizeGlbImagePadding(bytes),
      resources = readGltfResources(readGltfEnvelope(result))
    expect(result).toEqual(bytes)
    if (resources.status !== 'ready') throw Error('Missing image')
    expect(() => inspectReferenceRaster(resources.images[0]!.bytes)).toThrow()
  }
})
