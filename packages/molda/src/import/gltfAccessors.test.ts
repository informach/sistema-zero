import { expect, test } from 'bun:test'
import type { BufferAttribute, InterleavedBufferAttribute } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { bytesToBase64 } from '../core/skinCodec'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodeSceneGlb } from '../export/sceneGlb'
import { readAccessor, readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { makeSceneAssistedSkinFixture } from '../testing/sceneAssistedSkin'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import type { GltfComponentType } from './gltfAccessorLayout'
import { readGltfAccessors } from './gltfAccessors'
import { readGltfBuffers } from './gltfBuffers'
import { readGltfEnvelope } from './gltfEnvelope'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'

function fixture(accessors: unknown, views: unknown[] = [], bytes: Uint8Array = new Uint8Array()) {
  const json = {
    asset: { version: '2.0' },
    accessors,
    bufferViews: views.length ? views : undefined,
    buffers: bytes.length
      ? [
          {
            byteLength: bytes.length,
            uri: `data:application/octet-stream;base64,${bytesToBase64(bytes)}`,
          },
        ]
      : undefined,
  }
  const source = readGltfEnvelope(new TextEncoder().encode(JSON.stringify(json)))
  const resources = readGltfBuffers(source)
  if (resources.status !== 'ready') throw new Error('Fixture resource missing')
  return {
    json,
    source,
    resources,
    read: () => readGltfAccessors(source.json.accessors, resources),
  }
}
function failure(run: () => unknown, reason: GltfInputError['reason'] = 'invalid') {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(GltfInputError)
  expect((error as GltfInputError).reason).toBe(reason)
}
function write(view: DataView, type: GltfComponentType, offset: number, value: number) {
  switch (type) {
    case 5120:
      view.setInt8(offset, value)
      break
    case 5121:
      view.setUint8(offset, value)
      break
    case 5122:
      view.setInt16(offset, value, true)
      break
    case 5123:
      view.setUint16(offset, value, true)
      break
    case 5125:
      view.setUint32(offset, value, true)
      break
    case 5126:
      view.setFloat32(offset, value, true)
      break
  }
}
async function compareThree(data: ReturnType<typeof fixture>, index = 0) {
  const result = data.read()[index]!
  const loaded = await new GLTFLoader().parseAsync(JSON.stringify(data.json), '')
  const attribute: BufferAttribute | InterleavedBufferAttribute = await loaded.parser.getDependency(
    'accessor',
    index,
  )
  expect(attribute.count).toBe(result.count)
  const values: number[] = []
  for (let i = 0; i < attribute.count; i++)
    for (let c = 0; c < attribute.itemSize; c++) values.push(attribute.getComponent(i, c))
  expect(Array.from(result.values)).toEqual(values)
}

test.each([
  [5120, 1, [-128, -127, 0, 127]],
  [5121, 1, [0, 1, 128, 255]],
  [5122, 2, [-32768, -32767, 1, 32767]],
  [5123, 2, [0, 1, 32768, 65535]],
  [5125, 4, [0, 65535, 16777217, 4294967295]],
  [5126, 4, [-0, Math.fround(0.1), 1.401298464324817e-45, 3.4028234663852886e38]],
] as const)('reads numeric component %s exactly in little-endian and normalizes only supported integer types', async (type, step, input) => {
  const bytes = new Uint8Array(input.length * step)
  const view = new DataView(bytes.buffer)
  input.forEach((value, i) => {
    write(view, type, i * step, value)
  })
  const data = fixture(
    [{ bufferView: 0, componentType: type, type: 'SCALAR', count: input.length }],
    [{ buffer: 0, byteLength: bytes.length }],
    bytes,
  )
  expect(Array.from(data.read()[0]!.values)).toEqual([...input])
  await compareThree(data)
  if (type !== 5125 && type !== 5126) {
    const normalized = fixture(
      [
        {
          bufferView: 0,
          componentType: type,
          type: 'SCALAR',
          count: input.length,
          normalized: true,
          min: [input[0]],
          max: [input[input.length - 1]!],
        },
      ],
      [{ buffer: 0, byteLength: bytes.length }],
      bytes,
    )
    await compareThree(normalized)
    const result = normalized.read()[0]!
    expect(result.min).toEqual([input[0]])
    expect(result.max).toEqual([input[input.length - 1]!])
    expect(result.values[0]).toBe(type === 5120 || type === 5122 ? -1 : 0)
    expect(result.values[result.values.length - 1]).toBe(1)
  }
})

test('reads offset/interleaved vectors without reading unrelated attributes or rewriting caller bytes', async () => {
  const bytes = new Uint8Array(4 + 3 * 20)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < 3; i++) {
    for (let c = 0; c < 3; c++) view.setFloat32(4 + i * 20 + c * 4, i * 10 + c + 0.25, true)
    view.setFloat32(4 + i * 20 + 12, 100 + i, true)
    view.setFloat32(4 + i * 20 + 16, 200 + i, true)
  }
  const data = fixture(
    [
      { bufferView: 0, componentType: 5126, type: 'VEC3', count: 3 },
      { bufferView: 0, byteOffset: 12, componentType: 5126, type: 'VEC2', count: 3 },
    ],
    [{ buffer: 0, byteOffset: 4, byteLength: 60, byteStride: 20, target: 34962 }],
    bytes,
  )
  const before = new Uint8Array(data.resources.buffers[0]!)
  const result = data.read()
  expect(Array.from(result[0]!.values)).toEqual([
    0.25, 1.25, 2.25, 10.25, 11.25, 12.25, 20.25, 21.25, 22.25,
  ])
  expect(Array.from(result[1]!.values)).toEqual([100, 200, 101, 201, 102, 202])
  expect(result[1]!.layout).toEqual({
    bufferView: 0,
    byteOffset: 12,
    byteStride: 20,
    target: 34962,
  })
  await compareThree(data, 0)
  await compareThree(data, 1)
  result[0]!.values.fill(-1)
  expect(data.resources.buffers[0]).toEqual(before)
  data.resources.buffers[0]!.fill(0)
  expect(result[1]!.values[0]).toBe(100)
})

test.each([
  ['MAT2', 5121, 8, [0, 1, 4, 5]],
  ['MAT3', 5121, 12, [0, 1, 2, 4, 5, 6, 8, 9, 10]],
  ['MAT3', 5123, 24, [0, 2, 4, 8, 10, 12, 16, 18, 20]],
  ['MAT4', 5126, 64, Array.from({ length: 16 }, (_, i) => i * 4)],
] as const)('%s component %s respects column padding and omitted final padding', async (type, component, stride, offsets) => {
  const width = component === 5121 ? 1 : component === 5123 ? 2 : 4
  const length = stride + offsets[offsets.length - 1]! + width
  const bytes = new Uint8Array(length).fill(0xee),
    view = new DataView(bytes.buffer)
  const expected: number[] = []
  for (let i = 0; i < 2; i++)
    for (const [c, offset] of offsets.entries()) {
      const value = i * offsets.length + c + 1
      write(view, component, i * stride + offset, value)
      expected.push(value)
    }
  const data = fixture(
    [{ bufferView: 0, componentType: component, type, count: 2 }],
    [{ buffer: 0, byteLength: length }],
    bytes,
  )
  expect(Array.from(data.read()[0]!.values)).toEqual(expected)
  await expectValidGlb(
    encodeGlbContainer({ ...data.json, buffers: [{ byteLength: length }] }, [bytes]),
  )
  failure(() =>
    fixture(
      [{ bufferView: 0, componentType: component, type, count: 2 }],
      [{ buffer: 0, byteLength: length - 1 }],
      bytes,
    ).read(),
  )
})

test.each([
  false,
  true,
])('sparse replaces packed base or zeros (base=%s), validates bounds after replacement and agrees with Three', async (base) => {
  const bytes = new Uint8Array(52),
    view = new DataView(bytes.buffer)
  for (let i = 0; i < 4; i++) {
    view.setFloat32(i * 8, i, true)
    view.setFloat32(i * 8 + 4, i + 10, true)
  }
  bytes.set([1, 3], 32)
  for (const [i, value] of [100, 101, 200, 201].entries()) view.setFloat32(36 + i * 4, value, true)
  const data = fixture(
    [
      {
        ...(base ? { bufferView: 0 } : {}),
        componentType: 5126,
        type: 'VEC2',
        count: 4,
        min: base ? [0, 10] : [0, 0],
        max: [200, 201],
        sparse: {
          count: 2,
          indices: { bufferView: 1, componentType: 5121 },
          values: { bufferView: 2 },
        },
      },
    ],
    [
      { buffer: 0, byteLength: 32 },
      { buffer: 0, byteOffset: 32, byteLength: 2 },
      { buffer: 0, byteOffset: 36, byteLength: 16 },
    ],
    bytes,
  )
  const result = data.read()[0]!
  expect(Array.from(result.values)).toEqual(
    base ? [0, 10, 100, 101, 2, 12, 200, 201] : [0, 0, 100, 101, 0, 0, 200, 201],
  )
  await compareThree(data)
  ;(data.source.json.accessors as Array<Record<string, unknown>>)[0]!.max = [3, 13]
  failure(data.read)
})

test('sparse supports padded matrices and an interleaved base without inheriting base stride in replacement values', () => {
  const bytes = new Uint8Array(47).fill(0xee)
  bytes[0] = 1
  const offsets = [0, 1, 2, 4, 5, 6, 8, 9, 10]
  offsets.forEach((offset, i) => {
    bytes[4 + offset] = i + 1
    bytes[20 + offset] = i + 11
    bytes[36 + offset] = i + 21
  })
  const data = fixture(
    [
      {
        bufferView: 1,
        componentType: 5121,
        type: 'MAT3',
        count: 2,
        sparse: {
          count: 1,
          indices: { bufferView: 0, componentType: 5121 },
          values: { bufferView: 2 },
        },
      },
    ],
    [
      { buffer: 0, byteLength: 1 },
      { buffer: 0, byteOffset: 4, byteLength: 27, byteStride: 16 },
      { buffer: 0, byteOffset: 36, byteLength: 11 },
    ],
    bytes,
  )
  expect(Array.from(data.read()[0]!.values)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  ])
})

test.each([
  5121, 5123, 5125,
] as const)('sparse indices %s honor their own byte offsets and little-endian width', async (type) => {
  const width = type === 5121 ? 1 : type === 5123 ? 2 : 4
  const bytes = new Uint8Array(24),
    view = new DataView(bytes.buffer)
  write(view, type, 4 + width, 0)
  write(view, type, 4 + width * 2, 3)
  view.setInt16(20, -32768, true)
  view.setInt16(22, 32767, true)
  const data = fixture(
    [
      {
        componentType: 5122,
        type: 'SCALAR',
        count: 4,
        normalized: true,
        min: [-32768],
        max: [32767],
        sparse: {
          count: 2,
          indices: { bufferView: 0, byteOffset: width, componentType: type },
          values: { bufferView: 1, byteOffset: 2 },
        },
      },
    ],
    [
      { buffer: 0, byteOffset: 4, byteLength: width * 3 },
      { buffer: 0, byteOffset: 18, byteLength: 6 },
    ],
    bytes,
  )
  expect(Array.from(data.read()[0]!.values)).toEqual([-1, 0, 0, 1])
  await compareThree(data)
})

test('matrix alignment conforms to the independent validator at local and absolute offsets', async () => {
  for (const [viewOffset, accessorOffset] of [
    [0, 0],
    [4, 0],
    [0, 4],
    [1, 0],
    [1, 4],
  ] as const) {
    const bytes = new Uint8Array(16)
    const data = fixture(
      [{ bufferView: 0, byteOffset: accessorOffset, componentType: 5121, type: 'MAT2', count: 1 }],
      [{ buffer: 0, byteOffset: viewOffset, byteLength: 16 - viewOffset }],
      bytes,
    )
    await expectValidGlb(
      encodeGlbContainer({ ...data.json, buffers: [{ byteLength: bytes.length }] }, [bytes]),
    )
    expect(data.read()[0]!.values).toEqual(new Float64Array(4))
  }
  failure(() =>
    fixture(
      [{ bufferView: 0, byteOffset: 3, componentType: 5121, type: 'MAT2', count: 1 }],
      [{ buffer: 0, byteOffset: 1, byteLength: 15 }],
      new Uint8Array(16),
    ).read(),
  )
})

test('rejects sparse repeats/order/range, signed indices, misalignment, missing fields and views with target/stride', () => {
  const build = (
    indices: number[],
    patch: Record<string, unknown> = {},
    viewPatch: Record<string, unknown> = {},
  ) => {
    const bytes = new Uint8Array(12)
    bytes.set(indices)
    new DataView(bytes.buffer).setFloat32(4, 1, true)
    new DataView(bytes.buffer).setFloat32(8, 2, true)
    return fixture(
      [
        {
          componentType: 5126,
          type: 'SCALAR',
          count: 4,
          sparse: {
            count: 2,
            indices: { bufferView: 0, componentType: 5121 },
            values: { bufferView: 1 },
            ...patch,
          },
        },
      ],
      [
        { buffer: 0, byteLength: 2, ...viewPatch },
        { buffer: 0, byteOffset: 4, byteLength: 8 },
      ],
      bytes,
    )
  }
  for (const indices of [
    [1, 1],
    [2, 1],
    [1, 4],
    [255, 255],
  ])
    failure(build(indices).read)
  for (const patch of [
    { count: 0 },
    { count: 5 },
    { count: null },
    { indices: null },
    { values: null },
    { indices: { bufferView: 0, componentType: 5120 } },
    { indices: { bufferView: 99, componentType: 5121 } },
    { values: { bufferView: 1, byteOffset: 1 } },
  ])
    failure(build([0, 2], patch).read)
  for (const patch of [{ target: 34962 }, { byteStride: 4 }]) failure(build([0, 2], {}, patch).read)
})

test('rejects unsafe layouts/types/normalization and non-finite binary values rather than reading beyond a view', () => {
  const bytes = new Uint8Array(32),
    view = new DataView(bytes.buffer)
  const row = { bufferView: 0, type: 'VEC3', componentType: 5126, count: 2 }
  for (const patch of [
    { count: 0 },
    { count: -1 },
    { count: 1.5 },
    { count: null },
    { count: Number.MAX_SAFE_INTEGER + 1 },
    { type: 'constructor' },
    { type: 'VEC5' },
    { componentType: 5124 },
    { componentType: '5126' },
    { normalized: true },
    { normalized: null },
    { byteOffset: 1 },
    { byteOffset: 12 },
    { bufferView: 1 },
    { bufferView: null },
  ])
    failure(() => fixture([{ ...row, ...patch }], [{ buffer: 0, byteLength: 32 }], bytes).read())
  failure(() => fixture([row], [{ buffer: 0, byteLength: 32, byteStride: 8 }], bytes).read())
  failure(() =>
    fixture(
      [{ type: 'MAT2', componentType: 5121, count: 1, bufferView: 0, byteOffset: 1 }],
      [{ buffer: 0, byteLength: 32 }],
      bytes,
    ).read(),
  )
  failure(() =>
    fixture(
      [{ type: 'VEC2', componentType: 5123, count: 1, bufferView: 0 }],
      [{ buffer: 0, byteOffset: 1, byteLength: 4 }],
      bytes,
    ).read(),
  )
  failure(() =>
    fixture(
      [{ type: 'SCALAR', componentType: 5125, count: 1, normalized: true, bufferView: 0 }],
      [{ buffer: 0, byteLength: 4 }],
      bytes,
    ).read(),
  )
  failure(() => fixture([{ type: 'SCALAR', componentType: 5126, count: 1, byteOffset: 0 }]).read())
  for (const value of [NaN, Infinity, -Infinity]) {
    view.setFloat32(0, value, true)
    failure(() => fixture([row], [{ buffer: 0, byteLength: 32 }], bytes).read())
  }
})

test('validates raw min/max shapes, integer ranges and Float32-rounded bounds while preserving zero-initialized accessors', () => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setFloat32(0, 0.1, true)
  const row = { componentType: 5126, type: 'SCALAR', count: 1, bufferView: 0 }
  const valid = fixture(
    [{ ...row, min: [0.1], max: [0.1] }],
    [{ buffer: 0, byteLength: 4 }],
    bytes,
  ).read()[0]!
  expect(valid.min).toEqual([Math.fround(0.1)])
  for (const patch of [
    { min: [] },
    { min: null },
    { min: [0, 0] },
    { min: ['0.1'] },
    { min: [1e100] },
    { max: [0.2] },
    { min: [0.2], max: [0.1] },
  ])
    failure(() => fixture([{ ...row, ...patch }], [{ buffer: 0, byteLength: 4 }], bytes).read())
  for (const min of [-1, 256, 0.5])
    failure(() => fixture([{ componentType: 5121, type: 'SCALAR', count: 1, min: [min] }]).read())
  const zero = fixture([
    { componentType: 5126, type: 'VEC4', count: 3 },
    { componentType: 5121, type: 'SCALAR', count: 1, min: [1], max: [2] },
  ]).read()
  expect(zero[0]!.values).toEqual(new Float64Array(12))
  expect(zero[0]!.layout).toBeNull()
  expect(zero[1]!.values[0]).toBe(0)
  // glTF permits arbitrary bounds with no base/sparse, for data supplied by extensions.
  expect(zero[1]!.min).toEqual([1])
})

test('preflights aggregate expanded values including zero/sparse arrays, and metadata count', () => {
  const row = { componentType: 5126, type: 'SCALAR', count: GLTF_INPUT_LIMITS.accessorValues }
  const data = fixture([row])
  expect(data.read()[0]!.values.byteLength).toBe(32 * 1024 * 1024)
  failure(() => fixture([{ ...row, count: row.count + 1 }]).read(), 'budget')
  failure(() => fixture([row, { ...row, count: 1 }]).read(), 'budget')
  failure(() => fixture([{ ...row, type: 'MAT4' }]).read(), 'budget')
  failure(
    () =>
      fixture(
        Array.from({ length: GLTF_INPUT_LIMITS.accessors + 1 }, () => ({ ...row, count: 1 })),
      ).read(),
    'budget',
  )
  expect(fixture(undefined).read()).toEqual([])
  for (const invalid of [null, [], {}, [null]]) failure(() => fixture(invalid).read())
})

test('all accessors of real textured/animated and assisted/skinned exports match the independent decoder without source changes', () => {
  for (const document of [
    makeSceneGlbFixture(2, 2, 3, 2),
    makeSceneAssistedSkinFixture('local-delta').document,
  ]) {
    const original = structuredClone(document)
    const { bytes } = encodeSceneGlb(document, { allowLosses: true })
    const source = readGltfEnvelope(bytes),
      resources = readGltfBuffers(source)
    if (resources.status !== 'ready') throw new Error('Self-contained fixture expected')
    const accessors = readGltfAccessors(source.json.accessors, resources)
    const independent = readGlb(bytes)
    for (const [i, accessor] of accessors.entries())
      expect(Array.from(accessor.values)).toEqual(Array.from(readAccessor(independent, i)))
    expect(document).toEqual(original)
  }
})
