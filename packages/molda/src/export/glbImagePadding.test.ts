import { expect, test } from 'bun:test'
import { readGltfEnvelope } from '../import/gltfEnvelope'
import { readGltfResources } from '../import/gltfResources'
import { inspectReferenceRaster } from '../import/rasterHeader'
import { encodeGlbContainer } from './glbContainer'
import { normalizeGlbImagePadding, stabilizeGeneratedGlbImages } from './glbImagePadding'
import { encodePng } from './png'

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

test('generated image ordering is stable without moving numeric view indices, losing pixels or mutating source', () => {
  const outra = encodePng(new Uint8Array([0, 255, 0, 255]), 1, 1),
    numero = new Uint8Array(new Float32Array([42]).buffer)
  const montar = (inverter: boolean) => {
    const partes = [numero, inverter ? outra : png, numero, inverter ? png : outra],
      views: { buffer: number; byteOffset: number; byteLength: number }[] = []
    let offset = 0
    for (const p of partes) {
      views.push({ buffer: 0, byteOffset: offset, byteLength: p.length })
      offset += Math.ceil(p.length / 4) * 4
    }
    return encodeGlbContainer(
      {
        asset: { version: '2.0' },
        buffers: [{ byteLength: offset }],
        bufferViews: views,
        accessors: [
          { bufferView: 0, componentType: 5126, count: 1, type: 'SCALAR' },
          { bufferView: 2, componentType: 5126, count: 1, type: 'SCALAR' },
        ],
        images: [
          { name: 'A', mimeType: 'image/png', bufferView: inverter ? 3 : 1 },
          { name: 'B', mimeType: 'image/png', bufferView: inverter ? 1 : 3 },
        ],
        extras: { bufferView: 999, nota: 'Metadados opacos não são referências binárias.' },
      },
      partes,
    )
  }
  const a = montar(false),
    b = montar(true),
    original = b.slice(),
    ra = stabilizeGeneratedGlbImages(a),
    rb = stabilizeGeneratedGlbImages(b),
    e = readGltfEnvelope(rb),
    recursos = readGltfResources(e)
  expect(a).not.toEqual(b)
  expect(ra).toEqual(rb)
  expect(stabilizeGeneratedGlbImages(rb)).toEqual(rb)
  expect(b).toEqual(original)
  expect(e.json.extras).toEqual({
    bufferView: 999,
    nota: 'Metadados opacos não são referências binárias.',
  })
  expect((e.json.accessors as { bufferView: number }[]).map((a) => a.bufferView)).toEqual([0, 2])
  if (recursos.status !== 'ready') throw Error('Faltam recursos')
  expect(recursos.images[0]!.bytes).toEqual(png)
  expect(recursos.images[1]!.bytes).toEqual(outra)
  for (const i of [0, 2]) {
    const v = recursos.views[i]!
    expect(new DataView(recursos.buffers[0]!.buffer).getFloat32(v.byteOffset, true)).toBe(42)
  }
})
