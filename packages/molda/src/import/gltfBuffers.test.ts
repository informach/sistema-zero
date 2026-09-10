import { expect, test } from 'bun:test'
import { bytesToBase64 } from '../core/skinCodec'
import { encodeSceneGlb } from '../export/sceneGlb'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { type GltfLocalFile, readGltfBuffers } from './gltfBuffers'
import { type GltfEnvelope, readGltfEnvelope } from './gltfEnvelope'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'

function envelope(buffers?: unknown, bufferViews?: unknown): GltfEnvelope {
  return readGltfEnvelope(
    new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, buffers, bufferViews })),
  )
}
const uri = (bytes: Uint8Array) => `data:application/octet-stream;base64,${bytesToBase64(bytes)}`
const file = (path: string, bytes: Uint8Array = new Uint8Array([1, 2, 3, 4])): GltfLocalFile => ({
  path,
  bytes,
})
const ready = (value: ReturnType<typeof readGltfBuffers>) => {
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
  expect((error as GltfInputError).reason).toBe(reason)
  if (path) expect((error as GltfInputError).path).toBe(path)
}

test('resolves local, embedded and BIN buffers with owned bytes, exact declared ranges and deduplicated storage', () => {
  const source = envelope(
    [
      { uri: './mesh.bin', byteLength: 3 },
      { uri: 'dir/../mesh.bin', byteLength: 4 },
      { uri: uri(new Uint8Array([5, 6, 7, 8])), byteLength: 2 },
      { uri: uri(new Uint8Array([5, 6, 7, 8])), byteLength: 4 },
    ],
    [
      { buffer: 0, byteOffset: 1, byteLength: 2 },
      { buffer: 1, byteLength: 4, target: 34962, byteStride: 4 },
    ],
  )
  const external = file('mesh.bin', Buffer.from([1, 2, 3, 4]))
  const parsed = ready(readGltfBuffers(source, [external]))
  expect(parsed.buffers).toEqual([
    new Uint8Array([1, 2, 3]),
    new Uint8Array([1, 2, 3, 4]),
    new Uint8Array([5, 6]),
    new Uint8Array([5, 6, 7, 8]),
  ])
  expect(parsed.resourceBytes).toBe(8)
  expect(parsed.buffers[0]!.buffer).toBe(parsed.buffers[1]!.buffer)
  expect(parsed.buffers[2]!.buffer).toBe(parsed.buffers[3]!.buffer)
  expect(parsed.buffers[0]!.buffer).not.toBe(external.bytes.buffer)
  expect(parsed.views).toEqual([
    { buffer: 0, byteOffset: 1, byteLength: 2, byteStride: null, target: null },
    { buffer: 1, byteOffset: 0, byteLength: 4, byteStride: 4, target: 34962 },
  ])
  external.bytes.fill(99)
  ;(source.json.bufferViews as Array<Record<string, unknown>>)[0]!.byteOffset = 50
  expect(parsed.buffers[0]).toEqual(new Uint8Array([1, 2, 3]))
  expect(parsed.views[0]!.byteOffset).toBe(1)
  const binSource: GltfEnvelope = {
    ...envelope([{ byteLength: 3 }]),
    format: 'glb',
    bin: new Uint8Array([9, 8, 7, 0]),
  }
  const bin = ready(readGltfBuffers(binSource))
  expect(bin.buffers).toEqual([new Uint8Array([9, 8, 7])])
  expect(bin.resourceBytes).toBe(3)
  binSource.bin!.fill(0)
  expect(bin.buffers[0]).toEqual(new Uint8Array([9, 8, 7]))
  expect(ready(readGltfBuffers(envelope()))).toEqual({
    status: 'ready',
    buffers: [],
    views: [],
    resourceBytes: 0,
  })
})

test('lists every missing exact path once, never searches by basename or case and produces no partial result', () => {
  const source = envelope([
    { uri: 'a/body.bin', byteLength: 4 },
    { uri: 'b/body.bin', byteLength: 4 },
    { uri: 'a/body.bin', byteLength: 2 },
    { uri: 'Body.bin', byteLength: 4 },
  ])
  expect(readGltfBuffers(source, [file('body.bin')])).toEqual({
    status: 'missing',
    paths: ['a/body.bin', 'b/body.bin', 'Body.bin'],
  })
  expect(readGltfBuffers(source, [file('a/body.bin')])).toEqual({
    status: 'missing',
    paths: ['b/body.bin', 'Body.bin'],
  })
  expect(
    ready(readGltfBuffers(source, [file('a/body.bin'), file('b/body.bin'), file('Body.bin')]))
      .buffers,
  ).toHaveLength(4)
  // A missing file must not conceal an invalid declaration elsewhere.
  fails(
    () =>
      readGltfBuffers(
        envelope(
          [{ uri: 'missing.bin', byteLength: 4 }],
          [{ buffer: 0, byteOffset: 3, byteLength: 2 }],
        ),
      ),
    'invalid',
    'bufferViews[0]',
  )
  fails(
    () => readGltfBuffers(envelope(), [file('a/../mesh.bin'), file('mesh.bin')]),
    'invalid',
    'files',
  )
})

test('resolves Unicode/percent-encoded URI segments once relative to the entry, but selected names stay literal', () => {
  const cases: Array<[string, string]> = [
    ['../data/Bra%C3%A7o%20%E9%9B%AA.bin', 'bundle/data/Braço 雪.bin'],
    ['../data/Braço 雪.bin', 'bundle/data/Braço 雪.bin'],
    ['%2e%2e/data/mesh%2520.bin', 'bundle/data/mesh%20.bin'],
    ['../data/a%23b%3Fc.bin', 'bundle/data/a#b?c.bin'],
    ['../data/%252e%252e.bin', 'bundle/data/%2e%2e.bin'],
  ]
  for (const [resource, path] of cases) {
    const source = envelope([{ uri: resource, byteLength: 4 }])
    expect(
      ready(readGltfBuffers(source, [file(path)], 'bundle/models/model.gltf')).buffers[0],
    ).toEqual(new Uint8Array([1, 2, 3, 4]))
  }
  expect(
    readGltfBuffers(envelope([{ uri: 'mesh%20.bin', byteLength: 4 }]), [file('mesh%20.bin')]),
  ).toEqual({ status: 'missing', paths: ['mesh .bin'] })
})

test('rejects network/absolute paths, escaping traversal, encoded separators, directory references and ambiguous names', () => {
  for (const resource of [
    'https://example.invalid/a.bin',
    'file:///a.bin',
    'blob:local',
    'javascript:alert(1)',
    '//host/a.bin',
    '/a.bin',
    '../a.bin',
    'x/../../a.bin',
    '%2e%2e/a.bin',
    'a.bin?q=1',
    'a.bin#part',
  ])
    fails(
      () => readGltfBuffers(envelope([{ uri: resource, byteLength: 1 }])),
      'unsupported',
      'buffers[0].uri',
    )
  for (const resource of [
    'a\\b.bin',
    'a%2fb.bin',
    'a%5cb.bin',
    'a%00.bin',
    'a\n.bin',
    'a%.bin',
    'a%C0%AF.bin',
    'a//b.bin',
    'a.bin/',
    'a.bin/.',
    'a.bin/x/..',
  ])
    fails(
      () => readGltfBuffers(envelope([{ uri: resource, byteLength: 1 }]), [file('a.bin')]),
      'invalid',
      'buffers[0].uri',
    )
  fails(() => readGltfBuffers(envelope(), [file('a.bin/.')]), 'invalid', 'files.path')
})

test('checks data URI MIME, strict base64 and decoded size, preserving arbitrary bytes', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
  for (const resource of [
    uri(bytes),
    uri(bytes).replace('octet-stream', 'gltf-buffer'),
    uri(bytes).replace(
      'data:application/octet-stream;base64,',
      'DATA:APPLICATION/OCTET-STREAM;BASE64,',
    ),
    uri(bytes)
      .replace(/=/g, '%3D')
      .replace(/\+/g, '%2B')
      .replace(/\//g, (value, offset) => (offset > 40 ? '%2F' : value)),
  ])
    expect(
      ready(readGltfBuffers(envelope([{ uri: resource, byteLength: 256 }]))).buffers[0],
    ).toEqual(bytes)
  for (const resource of [
    'data:image/png;base64,AAAA',
    'data:application/octet-stream,%01%02',
    'data:application/octet-stream;charset=utf-8;base64,AAAA',
  ])
    fails(
      () => readGltfBuffers(envelope([{ uri: resource, byteLength: 1 }])),
      'unsupported',
      'buffers[0].uri',
    )
  for (const payload of ['AA', 'AAAA=', 'AA A', '====', 'AA==junk', '__==', '%ZZ', 'A===', 'éAAA'])
    fails(
      () =>
        readGltfBuffers(
          envelope([{ uri: `data:application/gltf-buffer;base64,${payload}`, byteLength: 1 }]),
        ),
      'invalid',
      'buffers[0].uri',
    )
  fails(
    () =>
      readGltfBuffers(envelope([{ uri: 'data:application/gltf-buffer;base64,', byteLength: 1 }])),
    'invalid',
    'buffers[0]',
  )
})

test('checks BIN binding, resource lengths and every bufferView range/default without rounding or padding exposure', () => {
  const bin = (length: number, bytes: Uint8Array | null): GltfEnvelope => ({
    ...envelope([{ byteLength: length }]),
    format: 'glb',
    bin: bytes,
  })
  for (const [length, bytes] of [
    [4, null],
    [4, new Uint8Array(3)],
    [1, new Uint8Array(8)],
    [3, new Uint8Array([1, 2, 3, 1])],
  ] as const)
    fails(() => readGltfBuffers(bin(length, bytes)), 'invalid', 'buffers[0]')
  fails(() => readGltfBuffers(envelope([{ byteLength: 1 }])), 'unsupported', 'buffers[0]')
  fails(
    () =>
      readGltfBuffers({
        ...bin(4, new Uint8Array(4)),
        json: { buffers: [{ byteLength: 4 }, { byteLength: 4 }] },
      }),
    'unsupported',
    'buffers[1]',
  )
  fails(
    () => readGltfBuffers(envelope([{ uri: 'a.bin', byteLength: 5 }]), [file('a.bin')]),
    'invalid',
    'buffers[0]',
  )
  for (const value of [0, -1, 1.5, '4', null, Infinity, Number.MAX_SAFE_INTEGER + 1])
    fails(
      () => readGltfBuffers(envelope([{ uri: 'a.bin', byteLength: value }]), [file('a.bin')]),
      'invalid',
      'buffers[0].byteLength',
    )
  const views = [
    { buffer: -1, byteLength: 1 },
    { buffer: 1, byteLength: 1 },
    { buffer: '0', byteLength: 1 },
    { buffer: 0, byteLength: 0 },
    { buffer: 0, byteLength: 5 },
    { buffer: 0, byteOffset: 4, byteLength: 1 },
    { buffer: 0, byteOffset: -1, byteLength: 1 },
    { buffer: 0, byteOffset: null, byteLength: 1 },
    { buffer: 0, byteOffset: Number.MAX_SAFE_INTEGER, byteLength: 1 },
    ...[0, 3, 5, 256, null, 1.5].map((byteStride) => ({ buffer: 0, byteLength: 4, byteStride })),
    ...[0, 1, '34962', null].map((target) => ({ buffer: 0, byteLength: 4, target })),
    { buffer: 0, byteLength: 4, target: 34963, byteStride: 4 },
  ]
  for (const view of views)
    fails(
      () => readGltfBuffers(envelope([{ uri: 'a.bin', byteLength: 4 }], [view]), [file('a.bin')]),
      'invalid',
    )
  for (const invalid of [null, [], {}, [null]])
    fails(() => readGltfBuffers(envelope(invalid)), 'invalid')
  for (const invalid of [null, [], {}, [null]])
    fails(() => readGltfBuffers(envelope(undefined, invalid)), 'invalid')
  const shared = new Uint8Array(new SharedArrayBuffer(4))
  fails(
    () => readGltfBuffers(envelope([{ uri: 'a.bin', byteLength: 4 }]), [file('a.bin', shared)]),
    'unsupported',
    'a.bin',
  )
})

test('bounds metadata and aggregate unique decoded bytes before copying, including unresolved resource requirements', () => {
  const limit = GLTF_INPUT_LIMITS.fileBytes
  fails(
    () => readGltfBuffers(envelope([{ uri: 'a.bin', byteLength: limit + 1 }])),
    'budget',
    'buffers[0].byteLength',
  )
  fails(
    () =>
      readGltfBuffers(
        envelope(
          Array.from({ length: GLTF_INPUT_LIMITS.resources + 1 }, () => ({
            uri: 'a.bin',
            byteLength: 1,
          })),
        ),
      ),
    'budget',
    'buffers',
  )
  fails(
    () =>
      readGltfBuffers(
        envelope(),
        Array.from({ length: GLTF_INPUT_LIMITS.resources + 1 }, (_, i) => file(`${i}.bin`)),
      ),
    'budget',
    'files',
  )
  fails(
    () =>
      readGltfBuffers(
        envelope(
          [{ uri: 'a.bin', byteLength: 1 }],
          Array.from({ length: GLTF_INPUT_LIMITS.bufferViews + 1 }, () => ({
            buffer: 0,
            byteLength: 1,
          })),
        ),
      ),
    'budget',
    'bufferViews',
  )
  fails(
    () =>
      readGltfBuffers(
        envelope([{ uri: 'a'.repeat(GLTF_INPUT_LIMITS.pathLength + 1), byteLength: 1 }]),
      ),
    'budget',
    'buffers[0].uri',
  )
  const two = envelope([
    { uri: 'a.bin', byteLength: limit },
    { uri: 'b.bin', byteLength: 1 },
  ])
  fails(() => readGltfBuffers(two), 'budget', 'resources')
  const bytes = new Uint8Array(limit)
  bytes[limit - 1] = 77
  fails(() => readGltfBuffers(two, [file('a.bin', bytes), file('b.bin')]), 'budget', 'resources')
  const duplicate = envelope([
    { uri: 'a.bin', byteLength: limit },
    { uri: './a.bin', byteLength: 1 },
  ])
  const result = ready(readGltfBuffers(duplicate, [file('a.bin', bytes)]))
  expect(result.resourceBytes).toBe(limit)
  expect(result.buffers[0]![limit - 1]).toBe(77)
  expect(result.buffers[0]!.buffer).toBe(result.buffers[1]!.buffer)
  expect(bytes[limit - 1]).toBe(77)
})

test('matches every declared buffer/view of actual textured and assisted/skinned GLB exports', () => {
  for (const document of [
    makeSceneGlbFixture(2, 2, 3, 2),
    makeSceneAssistedSkinFixture('local').document,
  ]) {
    const original = structuredClone(document)
    const source = readGltfEnvelope(encodeSceneGlb(document, { allowLosses: true }).bytes)
    const result = ready(readGltfBuffers(source))
    expect(result.buffers).toHaveLength(1)
    const expectedLength = (source.json.buffers as Array<{ byteLength: number }>)[0]!.byteLength
    expect(result.buffers[0]).toEqual(source.bin!.subarray(0, expectedLength))
    for (const [i, view] of result.views.entries()) {
      const raw = (
        source.json.bufferViews as Array<{ buffer: number; byteOffset: number; byteLength: number }>
      )[i]!
      expect(
        result.buffers[view.buffer]!.subarray(view.byteOffset, view.byteOffset + view.byteLength),
      ).toEqual(source.bin!.subarray(raw.byteOffset, raw.byteOffset + raw.byteLength))
    }
    expect(document).toEqual(original)
  }
})
