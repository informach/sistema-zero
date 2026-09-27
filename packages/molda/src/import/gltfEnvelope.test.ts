import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { readGlb } from '../testing/glbRead'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { readGltfEnvelope } from './gltfEnvelope'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'

const JSON_CHUNK = 0x4e4f534a,
  BIN_CHUNK = 0x004e4942
const encode = (text: string) => new TextEncoder().encode(text)
const minimal = '{"asset":{"version":"2.0"}}'

/** Independent byte fixture, not the production container writer. */
function container(chunks: Array<[number, Uint8Array]>) {
  const result = new Uint8Array(
    12 + chunks.reduce((sum, [, data]) => sum + 8 + Math.ceil(data.length / 4) * 4, 0),
  )
  const view = new DataView(result.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, result.length, true)
  let offset = 12
  for (const [type, data] of chunks) {
    const length = Math.ceil(data.length / 4) * 4
    view.setUint32(offset, length, true)
    view.setUint32(offset + 4, type, true)
    if (type === JSON_CHUNK) result.fill(0x20, offset + 8, offset + 8 + length)
    result.set(data, offset + 8)
    offset += 8 + length
  }
  return result
}
const glb = (json = minimal) =>
  container([
    [JSON_CHUNK, encode(json)],
    [BIN_CHUNK, new Uint8Array([1, 2, 3])],
  ])

function failure(bytes: Uint8Array, reason: GltfInputError['reason'], path?: string) {
  let error: unknown
  try {
    readGltfEnvelope(bytes)
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  expect((error as GltfInputError).reason).toBe(reason)
  if (path) expect((error as GltfInputError).path).toBe(path)
}

test('reads JSON-only GLB, optional BIN, plain glTF and unknown chunks without resource interpretation', () => {
  expect(readGltfEnvelope(encode(minimal))).toEqual({
    format: 'gltf',
    json: { asset: { version: '2.0' } },
    bin: null,
    unknownChunkTypes: [],
  })
  expect(readGltfEnvelope(container([[JSON_CHUNK, encode(minimal)]]))).toEqual({
    format: 'glb',
    json: { asset: { version: '2.0' } },
    bin: null,
    unknownChunkTypes: [],
  })
  const unknown = 0x504f4e51
  const json = {
    asset: { version: '2.0' },
    buffers: [{ uri: 'https://example.invalid/never-fetch.bin' }],
    extensionsRequired: ['never_execute'],
    extensions: { never_execute: { script: 'throw new Error()' } },
    extras: { constructor: 'data', __proto__: null },
  }
  const parsed = readGltfEnvelope(
    container([
      [JSON_CHUNK, encode(JSON.stringify(json))],
      [BIN_CHUNK, new Uint8Array([1, 2, 3])],
      [unknown, new Uint8Array([255])],
      [unknown, new Uint8Array()],
    ]),
  )
  expect(parsed.json).toEqual(json)
  expect(parsed.bin).toEqual(new Uint8Array([1, 2, 3, 0]))
  expect(parsed.unknownChunkTypes).toEqual([unknown, unknown])
  expect(
    readGltfEnvelope(
      container([
        [JSON_CHUNK, encode(minimal)],
        [unknown, new Uint8Array()],
      ]),
    ).bin,
  ).toBeNull()
})

test('uses UTF-8/BOM, JSON duplicate-key and integer exponent semantics without stripping unknown properties', () => {
  const raw =
    '\ufeff{"asset":{"version":"1.0","version":"2.0"},"nodes":[{"name":"Braço 雪 \\ud83d\\ude80"}],"extras":{"__proto__":{"polluted":true},"count":1e2,"escaped":"\\"\\\\[]{}:,"}}'
  const result = readGltfEnvelope(encode(raw))
  expect(result.json.asset).toEqual({ version: '2.0' })
  expect(result.json.nodes).toEqual([{ name: 'Braço 雪 🚀' }])
  expect(Object.hasOwn(result.json.extras as object, '__proto__')).toBe(true)
  expect(Object.getPrototypeOf(result.json.extras)).toBe(Object.prototype)
  expect((result.json.extras as Record<string, unknown>).count).toBe(100)
  expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  expect(readGltfEnvelope(container([[JSON_CHUNK, encode(raw)]])).json).toEqual(result.json)
  for (const text of [
    'null',
    '[]',
    'true',
    '{}',
    '{"asset":null}',
    '{"asset":[]}',
    `${minimal}x`,
    '{"asset":{"version":"2.0"},}',
    `${minimal}\0`,
  ])
    failure(encode(text), 'invalid')
  const malformed = encode(minimal)
  malformed[3] = 0xff
  failure(malformed, 'invalid', 'json')
  failure(new Uint8Array([0xff, 0xfe, 123, 0, 125, 0]), 'invalid', 'json')
})

test('compares asset/minimum versions separately from container version without floating point or minor-version rejection', () => {
  const read = (version: unknown, minVersion?: unknown) =>
    encode(
      JSON.stringify({ asset: { version, ...(minVersion === undefined ? {} : { minVersion }) } }),
    )
  for (const [v, min] of [
    ['2.0', undefined],
    ['2.10', undefined],
    ['0002.000', undefined],
    ['2.123456789012345678901234567890', undefined],
    ['3.0', '2.0'],
    ['2.10', '2.0'],
  ]) {
    expect(readGltfEnvelope(read(v, min)).format).toBe('gltf')
  }
  for (const [v, min] of [
    ['1.0', undefined],
    ['3.0', undefined],
    ['2.1', '2.1'],
    ['2.9999999999999999999999999999', '2.9007199254740992'],
    ['1.0', '1.0'],
  ])
    failure(read(v, min), 'unsupported')
  for (const value of [undefined, null, 2, '2', '2.0.0', '2.a', '+2.0', '2.0\n', '2e0.0', '2.-1'])
    failure(read(value), 'invalid', 'asset.version')
  for (const min of [null, '2.1', '3.0', '2.0.0'])
    failure(read('2.0', min), 'invalid', 'asset.minVersion')
  failure(read('2.9007199254740992', '2.9007199254740993'), 'invalid', 'asset.minVersion')
  const newer = glb()
  new DataView(newer.buffer).setUint32(4, 3, true)
  failure(newer, 'unsupported', 'header.version')
  failure(glb('{"asset":{"version":"1.0"}}'), 'unsupported', 'asset.version')
})

test('rejects every truncated prefix and malformed header/chunk layout with a typed error', () => {
  const source = glb()
  for (let i = 0; i < source.length; i++) failure(source.subarray(0, i), 'invalid')
  for (const [offset, value] of [
    [8, source.length - 1],
    [8, source.length + 1],
    [8, 0xffffffff],
    [12, 0xffffffff],
    [12, 3],
    [12, source.length],
    [16, BIN_CHUNK],
  ] as const) {
    const bytes = source.slice()
    new DataView(bytes.buffer).setUint32(offset, value, true)
    failure(bytes, 'invalid')
  }
  const malformed = [
    container([]),
    container([[BIN_CHUNK, new Uint8Array()]]),
    container([
      [1, new Uint8Array()],
      [JSON_CHUNK, encode(minimal)],
    ]),
    container([
      [JSON_CHUNK, encode(minimal)],
      [JSON_CHUNK, encode(minimal)],
    ]),
    container([
      [JSON_CHUNK, encode(minimal)],
      [BIN_CHUNK, new Uint8Array()],
      [BIN_CHUNK, new Uint8Array()],
    ]),
    container([
      [JSON_CHUNK, encode(minimal)],
      [1, new Uint8Array()],
      [BIN_CHUNK, new Uint8Array()],
    ]),
    container([[JSON_CHUNK, new Uint8Array()]]),
  ]
  for (const bytes of malformed) failure(bytes, 'invalid')
  const jsonOnly = container([[JSON_CHUNK, encode(minimal)]])
  for (let extra = 1; extra <= 7; extra++) {
    const bytes = new Uint8Array(jsonOnly.length + extra)
    bytes.set(jsonOnly)
    new DataView(bytes.buffer).setUint32(8, bytes.length, true)
    failure(bytes, 'invalid', 'chunks')
  }
})

test('owns binary bytes even for Buffer and nonzero-offset input views, without retaining the entire file', () => {
  for (const buffer of [false, true]) {
    const source = glb()
    const outer = buffer ? Buffer.alloc(source.length + 11) : new Uint8Array(source.length + 11)
    outer.set(source, 7)
    const input = outer.subarray(7, 7 + source.length)
    const parsed = readGltfEnvelope(input)
    expect(parsed.bin).toEqual(new Uint8Array([1, 2, 3, 0]))
    expect(parsed.bin!.buffer).not.toBe(input.buffer)
    expect(parsed.bin!.buffer.byteLength).toBe(4)
    parsed.bin![0] = 99
    expect(input).toEqual(source)
    input.fill(0)
    expect(parsed.bin).toEqual(new Uint8Array([99, 2, 3, 0]))
    expect(parsed.json).toEqual({ asset: { version: '2.0' } })
  }
  failure(new Uint8Array(new SharedArrayBuffer(8)), 'unsupported', 'file')
  const detached = new Uint8Array(8)
  structuredClone(detached.buffer, { transfer: [detached.buffer] })
  failure(detached, 'invalid', 'file')
})

test('bounds bytes, chunks, nesting and structural allocations before parsing; quoted punctuation is not structure', () => {
  failure(new Uint8Array(GLTF_INPUT_LIMITS.fileBytes + 1), 'budget', 'file')
  const padded = new Uint8Array(GLTF_INPUT_LIMITS.fileBytes).fill(0x20)
  padded.set(encode(minimal))
  expect(readGltfEnvelope(padded).format).toBe('gltf')
  const chunks: Array<[number, Uint8Array]> = [[JSON_CHUNK, encode(minimal)]]
  for (let i = 1; i < GLTF_INPUT_LIMITS.chunks; i++) chunks.push([1, new Uint8Array()])
  expect(readGltfEnvelope(container(chunks)).unknownChunkTypes).toHaveLength(
    GLTF_INPUT_LIMITS.chunks - 1,
  )
  chunks.push([1, new Uint8Array()])
  failure(container(chunks), 'budget', 'chunks')
  const nested = (count: number) =>
    encode(`{"asset":{"version":"2.0"},"extras":${'['.repeat(count)}0${']'.repeat(count)}}`)
  expect(readGltfEnvelope(nested(GLTF_INPUT_LIMITS.jsonDepth - 1)).format).toBe('gltf')
  failure(nested(GLTF_INPUT_LIMITS.jsonDepth), 'budget', 'json')
  failure(
    encode(
      `{"asset":{"version":"2.0"},"extras":[${'0,'.repeat(GLTF_INPUT_LIMITS.jsonStructure)}0]}`,
    ),
    'budget',
    'json',
  )
  expect(
    readGltfEnvelope(
      encode(JSON.stringify({ asset: { version: '2.0' }, extras: '\\"[]{}:,'.repeat(200000) })),
    ).format,
  ).toBe('gltf')
})

test('reads actual textured/animated and assisted/skinned Molda exports against the independent test decoder', () => {
  for (const document of [
    makeSceneGlbFixture(2, 2, 3, 2),
    makeSceneAssistedSkinFixture('local-delta').document,
  ]) {
    const source = structuredClone(document)
    const { bytes } = encodeSceneGlb(document, { allowLosses: true })
    const parsed = readGltfEnvelope(bytes)
    const independent = readGlb(bytes)
    expect(parsed.json).toEqual(independent.json)
    expect(parsed.bin).toEqual(independent.bin)
    expect(parsed.unknownChunkTypes).toEqual([])
    expect(document).toEqual(source)
  }
})
