import { expect, test } from 'bun:test'
import { bytesToBase64 } from '../core/skinCodec'
import { encodeSceneGlb } from '../export/sceneGlb'
import { expectValidGlb } from '../testing/gltfValidation'
import { decodePng } from '../testing/pngDecode'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readGltfAccessors } from './gltfAccessors'
import { readGltfAppearance } from './gltfAppearance'
import { readGltfBuffers } from './gltfBuffers'
import { type GltfEnvelope, readGltfEnvelope } from './gltfEnvelope'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import { readGltfResources } from './gltfResources'

function envelope(json: Record<string, unknown> = {}): GltfEnvelope {
  return readGltfEnvelope(
    new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, ...json })),
  )
}
function ready(value: ReturnType<typeof readGltfResources>) {
  if (value.status !== 'ready')
    throw new Error(`Missing fixture resources: ${value.paths.join(', ')}`)
  return value
}
function fails(run: () => unknown, reason: GltfInputError['reason'], path?: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  if (!(error instanceof GltfInputError)) throw new Error('Expected a structured input error')
  expect(error.reason).toBe(reason)
  if (path) expect(error.path).toBe(path)
}
const dataUri = (bytes: Uint8Array, type = 'image/png') =>
  `data:${type};base64,${bytesToBase64(bytes)}`

test('the aggregate budget includes whole referenced files and embedded images, but counts shared views once', () => {
  const limit = GLTF_INPUT_LIMITS.fileBytes
  const source = envelope({
    buffers: [{ uri: 'large.bin', byteLength: limit }],
    images: [{ uri: 'data:image/png,%01' }],
  })
  fails(() => readGltfResources(source), 'budget', 'resources')
  const bytes = new Uint8Array(limit)
  bytes[limit - 1] = 17
  fails(() => readGltfResources(source, [{ path: 'large.bin', bytes }]), 'budget', 'resources')
  const shared = envelope({
    buffers: [{ uri: 'large.bin', byteLength: limit }],
    bufferViews: [{ buffer: 0, byteOffset: limit - 1, byteLength: 1 }],
    images: Array.from({ length: 2000 }, (_, i) =>
      i % 2 ? { uri: './large.bin' } : { bufferView: 0, mimeType: 'image/png' },
    ),
  })
  const result = ready(readGltfResources(shared, [{ path: 'large.bin', bytes }]))
  expect(result.resourceBytes).toBe(limit)
  for (let i = 0; i < result.images.length; i++) {
    const image = result.images[i]!
    expect(image.bytes.buffer).toBe(result.buffers[0]!.buffer)
    expect(image.bytes.byteLength).toBe(i % 2 ? limit : 1)
    expect(image.bytes[image.bytes.length - 1]).toBe(17)
  }
  // A buffer declaring just one byte still retains/counts its entire local resource.
  fails(
    () =>
      readGltfResources(
        envelope({ ...source.json, buffers: [{ uri: 'large.bin', byteLength: 1 }] }),
        [{ path: 'large.bin', bytes }],
      ),
    'budget',
    'resources',
  )
  fails(
    () =>
      readGltfResources(envelope({ images: [{ uri: 'huge.png' }] }), [
        { path: 'huge.png', bytes: new Uint8Array(limit + 1) },
      ]),
    'budget',
    'huge.png',
  )
})

test('unique resource count covers both families, while duplicate images do not consume extra resource slots', () => {
  const count = GLTF_INPUT_LIMITS.resources
  const buffers = Array.from({ length: count }, (_, i) => ({ uri: `${i}.bin`, byteLength: 1 }))
  const source = envelope({ buffers, images: [{ uri: '0.bin' }] })
  const missing = readGltfResources(source)
  expect(missing.status).toBe('missing')
  if (missing.status === 'missing') expect(missing.paths).toHaveLength(count)
  fails(
    () => readGltfResources(envelope({ buffers, images: [{ uri: 'new.png' }] })),
    'budget',
    'resources',
  )
  fails(
    () =>
      readGltfResources(
        envelope({ images: Array.from({ length: count + 1 }, (_, i) => ({ uri: `${i}.png` })) }),
      ),
    'budget',
    'resources',
  )
  const result = ready(
    readGltfResources(
      envelope({
        images: Array.from({ length: GLTF_INPUT_LIMITS.appearanceItems }, () => ({
          uri: 'data:image/png,%00',
        })),
      }),
    ),
  )
  expect(result.images).toHaveLength(GLTF_INPUT_LIMITS.appearanceItems)
  expect(result.resourceBytes).toBe(1)
  expect(result.images.at(-1)!.bytes).toBe(result.images[0]!.bytes)
  const over = envelope()
  over.json.images = new Array(GLTF_INPUT_LIMITS.appearanceItems + 1)
  fails(() => readGltfResources(over), 'budget', 'images')
})

test('unused selected bytes are never inspected, and a fresh import never inherits a previous resource cache', () => {
  const source = envelope({ images: [{ uri: 'paint.png' }] })
  let unusedReads = 0
  const unused = {
    path: 'unused.png',
    get bytes(): Uint8Array {
      unusedReads++
      throw new Error('Unused resource read')
    },
  }
  const bytes = new Uint8Array([1, 2, 3])
  const files = [{ path: 'paint.png', bytes }, unused]
  const first = ready(readGltfResources(source, files))
  bytes[0] = 99
  const second = ready(readGltfResources(source, files))
  expect(Array.from(first.images[0]!.bytes)).toEqual([1, 2, 3])
  expect(Array.from(second.images[0]!.bytes)).toEqual([99, 2, 3])
  expect(first.images[0]!.bytes.buffer).not.toBe(second.images[0]!.bytes.buffer)
  expect(unusedReads).toBe(0)
  expect(readGltfResources(envelope())).toEqual({
    status: 'ready',
    buffers: [],
    views: [],
    images: [],
    resourceBytes: 0,
  })
  fails(
    () => readGltfResources(source, [...files, { path: './paint.png', bytes }]),
    'invalid',
    'files',
  )
})

test('byte resolution cannot bypass later accessor/image role validation or reinterpret a cached buffer data URI', () => {
  const uri = dataUri(new Uint8Array([1, 2, 3]), 'application/octet-stream')
  fails(
    () => readGltfResources(envelope({ buffers: [{ uri, byteLength: 3 }], images: [{ uri }] })),
    'unsupported',
    'images[0].uri',
  )
  const source = envelope({
    buffers: [{ uri, byteLength: 3 }],
    bufferViews: [{ buffer: 0, byteLength: 3 }],
    accessors: [{ bufferView: 0, componentType: 5121, count: 3, type: 'SCALAR' }],
    images: [{ bufferView: 0, mimeType: 'image/png' }],
  })
  const result = ready(readGltfResources(source))
  const accessors = readGltfAccessors(source.json.accessors, result)
  fails(
    () => readGltfAppearance(source.json, result.views, accessors),
    'invalid',
    'images[0].bufferView',
  )
})

test('actual textured GLB keeps buffer reader compatibility and exact PNG bytes through all three image source forms', async () => {
  const document = makeSceneGlbFixture(2, 2, 3, 2)
  const original = structuredClone(document)
  const encoded = encodeSceneGlb(document, { allowLosses: true }).bytes
  await expectValidGlb(encoded)
  const source = readGltfEnvelope(encoded),
    result = ready(readGltfResources(source))
  const { images, ...bufferRead } = result
  const legacyRead = readGltfBuffers(source)
  if (legacyRead.status !== 'ready') throw new Error('Exported GLB has no missing resources')
  expect(bufferRead).toEqual(legacyRead)
  const accessors = readGltfAccessors(source.json.accessors, result)
  const appearance = readGltfAppearance(source.json, result.views, accessors)
  expect(images.length).toBeGreaterThan(0)
  expect(images).toHaveLength(appearance.images.length)
  for (const [i, image] of images.entries()) {
    const descriptor = appearance.images[i]!
    expect(descriptor.kind).toBe('bufferView')
    if (descriptor.kind !== 'bufferView') throw new Error('Fixture must embed PNG in BIN')
    const view = result.views[descriptor.bufferView]!
    expect(image.bytes).toEqual(
      source.bin!.subarray(view.byteOffset, view.byteOffset + view.byteLength),
    )
    expect(image.bytes.buffer).toBe(result.buffers[0]!.buffer)
    const parsed = decodePng(image.bytes)
    expect(parsed.width).toBe(2)
    expect(parsed.height).toBe(2)
    const uri = dataUri(image.bytes)
    const linked = ready(
      readGltfResources(
        envelope({ images: [{ uri }, { uri: 'paint.png', mimeType: 'image/png' }] }),
        [{ path: 'paint.png', bytes: image.bytes }],
      ),
    )
    for (const copy of linked.images) {
      expect(copy.bytes).toEqual(image.bytes)
      expect(decodePng(copy.bytes)).toEqual(parsed)
    }
  }
  source.bin!.fill(0)
  for (const image of images) expect(decodePng(image.bytes).width).toBe(2)
  expect(document).toEqual(original)
})

test('one owned resource backs local images, buffers and exact views without retaining the caller backing', () => {
  const backing = Buffer.from([100, 10, 20, 30, 40, 50, 101])
  const source = envelope({
    buffers: [
      { uri: 'pixels.dat', byteLength: 4 },
      { uri: './pixels.dat', byteLength: 2 },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 1, byteLength: 2 }],
    images: [
      { uri: 'pixels.dat', name: 'Inteira', mimeType: 'image/png' },
      { uri: 'dir/../pixels.dat' },
      { bufferView: 0, mimeType: 'image/jpeg' },
    ],
  })
  const result = ready(
    readGltfResources(source, [{ path: 'pixels.dat', bytes: backing.subarray(1, 6) }]),
  )
  expect(result.resourceBytes).toBe(5)
  expect(result.buffers.map((bytes) => Array.from(bytes))).toEqual([
    [10, 20, 30, 40],
    [10, 20],
  ])
  expect(result.images.map((image) => Array.from(image.bytes))).toEqual([
    [10, 20, 30, 40, 50],
    [10, 20, 30, 40, 50],
    [20, 30],
  ])
  const owned = result.buffers[0]!.buffer
  expect(owned.byteLength).toBe(5)
  expect(owned).not.toBe(backing.buffer)
  for (const image of result.images) expect(image.bytes.buffer).toBe(owned)
  expect(result.images[0]).toMatchObject({
    name: 'Inteira',
    mimeType: 'image/png',
    uriMimeType: null,
  })
  expect(result.images[1]).toMatchObject({ name: null, mimeType: null, uriMimeType: null })
  backing.fill(0)
  expect(Array.from(result.images[2]!.bytes)).toEqual([20, 30])
  result.images[2]!.bytes[0] = 77
  expect(result.buffers[0]![1]).toBe(77) // owned sharing is explicit, not independent mutable images
  expect(backing.every((byte) => byte === 0)).toBe(true)
})

test('image data URIs preserve all 256 octets in base64 or percent form without UTF-8 conversion', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
  const percent = Array.from(bytes, (byte) => `%${byte.toString(16).padStart(2, '0')}`).join('')
  for (const type of ['png', 'jpeg']) {
    const uris = [
      dataUri(bytes, `image/${type}`),
      `DATA:IMAGE/${type.toUpperCase()},${percent}`,
      dataUri(bytes, `image/${type}`).replace(/=/g, '%3D').replace(/\+/g, '%2b'),
    ]
    for (const uri of uris) {
      const result = ready(readGltfResources(envelope({ images: [{ uri }, { uri }] })))
      expect(result.images[0]!.bytes).toEqual(bytes)
      expect(result.images[0]!.uriMimeType).toBe(`image/${type}`)
      expect(result.images[0]!.mimeType).toBeNull()
      expect(result.images[0]!.bytes).toBe(result.images[1]!.bytes)
      expect(result.resourceBytes).toBe(256)
    }
  }
  const literal = "AZaz09-_.!~*'();/?:@&=+$,"
  const result = ready(
    readGltfResources(
      envelope({ images: [{ uri: `data:image/png,${literal}%25%80%ff%00%2520` }] }),
    ),
  )
  expect(Array.from(result.images[0]!.bytes)).toEqual([
    ...Array.from(new TextEncoder().encode(literal)),
    37,
    128,
    255,
    0,
    37,
    50,
    48,
  ])
})

test('malformed embedded octets/base64 fail and unsupported data MIME/parameters are never interpreted', () => {
  for (const payload of [
    '%',
    '%0',
    '%GG',
    'a%0g',
    'a b',
    '\n',
    '\t',
    'é',
    '#fragment',
    '\\',
    '"',
    '<',
    '[',
  ])
    fails(
      () => readGltfResources(envelope({ images: [{ uri: `data:image/png,${payload}` }] })),
      'invalid',
      'images[0].uri',
    )
  for (const payload of ['AA', 'AAAA=', 'AA A', '====', 'AA==tail', '__==', '%ZZ', 'A===', '%FF'])
    fails(
      () => readGltfResources(envelope({ images: [{ uri: `data:image/png;base64,${payload}` }] })),
      'invalid',
      'images[0].uri',
    )
  for (const uri of [
    'data:,abc',
    'data:text/html,%3Cscript%3E',
    'data:image/svg+xml,<svg/>',
    'data:image/webp;base64,AAAA',
    'data:image/png;charset=utf-8;base64,AAAA',
    'data:image/png;unknown,abc',
  ])
    fails(() => readGltfResources(envelope({ images: [{ uri }] })), 'unsupported', 'images[0].uri')
  // Resolution keeps both declarations; raster validation must check the content later.
  const result = ready(
    readGltfResources(
      envelope({ images: [{ uri: 'data:image/jpeg;base64,AAAA', mimeType: 'image/png' }] }),
    ),
  )
  expect(result.images[0]).toMatchObject({ mimeType: 'image/png', uriMimeType: 'image/jpeg' })
})

test('missing buffers and images are listed once without basename/case fallback or partial byte results', () => {
  const source = envelope({
    buffers: [{ uri: '../mesh.bin', byteLength: 4 }],
    images: [
      { uri: '../mesh.bin' },
      { uri: '../tex/Cor%20%E9%9B%AA.png' },
      { uri: '../tex/Cor%2520.png' },
      { uri: '../tex/cor%20%E9%9B%AA.png' },
    ],
  })
  const entry = 'bundle/model/scene.gltf'
  expect(
    readGltfResources(source, [{ path: 'mesh.bin', bytes: new Uint8Array(4) }], entry),
  ).toEqual({
    status: 'missing',
    paths: [
      'bundle/mesh.bin',
      'bundle/tex/Cor 雪.png',
      'bundle/tex/Cor%20.png',
      'bundle/tex/cor 雪.png',
    ],
  })
  const files = [
    'bundle/mesh.bin',
    'bundle/tex/Cor 雪.png',
    'bundle/tex/Cor%20.png',
    'bundle/tex/cor 雪.png',
  ].map((path) => ({ path, bytes: new Uint8Array(4) }))
  expect(ready(readGltfResources(source, files, entry)).resourceBytes).toBe(16)
  const missing = { buffers: [{ uri: 'missing.bin', byteLength: 1 }] }
  fails(
    () => readGltfResources(envelope({ ...missing, images: [{ uri: 'data:image/png,%GG' }] })),
    'invalid',
    'images[0].uri',
  )
  fails(
    () =>
      readGltfResources(
        envelope({ ...missing, images: [{ bufferView: 0, mimeType: 'image/png' }] }),
      ),
    'invalid',
    'images[0].bufferView',
  )
})

test('image paths obey the same no-network and selected-bundle boundary as buffers', () => {
  for (const uri of [
    'https://example.invalid/a.png',
    'blob:local',
    'javascript:alert(1)',
    '//host/a.png',
    '/a.png',
    '../a.png',
    '%2e%2e/a.png',
    'a.png?q=1',
    'a.png#part',
  ])
    fails(() => readGltfResources(envelope({ images: [{ uri }] })), 'unsupported', 'images[0].uri')
  for (const uri of [
    'a%2fb.png',
    'a%5cb.png',
    'a%00.png',
    'a\\b.png',
    'a//b.png',
    'a.png/.',
    'a.png/x/..',
    '',
  ])
    fails(() => readGltfResources(envelope({ images: [{ uri }] })), 'invalid', 'images[0].uri')
  fails(
    () =>
      readGltfResources(envelope({ images: [{ uri: 'a.png' }] }), [
        { path: 'a.png', bytes: new Uint8Array(new SharedArrayBuffer(3)) },
      ]),
    'unsupported',
    'a.png',
  )
})
