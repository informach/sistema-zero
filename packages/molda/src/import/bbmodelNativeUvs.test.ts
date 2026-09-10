import { expect, test } from 'bun:test'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { convertBbmodelFaceUvs } from './bbmodelFaceUvs'
import { readBbmodelGeometry } from './bbmodelGeometry'
import { BBMODEL_CUBE_DIRECTIONS } from './bbmodelGeometryTypes'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelNativeGeometry } from './bbmodelNativeGeometryPlan'
import { convertBbmodelNativeUvs } from './bbmodelNativeUvs'
import { planBbmodelSelection } from './bbmodelSelection'
import { bindBbmodelTextures } from './bbmodelTextureBinding'
import { bbmodelUvDimensions } from './bbmodelUvDimensions'

function fixture(version = '5.0', extra: Record<string, unknown> = {}) {
  const uv = { a: [8, 4], b: [24, 4], c: [24, 12], d: [8, 12] },
    envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          elements: [
            {
              uuid: 'shape',
              type: 'mesh',
              vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [2, 2, 0], d: [0, 2, 0] },
              faces: { 'q " id': { vertices: ['a', 'b', 'c', 'd'], uv, texture: 0 } },
            },
          ],
          outliner: ['shape'],
          textures: [{ uuid: 'paint', uv_width: 64, uv_height: 32 }],
          ...extra,
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    source = readBbmodelGeometry(graph),
    appearance = readBbmodelAppearance(envelope),
    plans = planBbmodelNativeGeometry(source, planBbmodelSelection(envelope, graph)).plans,
    authorial = convertBbmodelFaceUvs(source, plans, appearance).geometries,
    bindings = bindBbmodelTextures(source, appearance)
  return { source, appearance, plans, authorial, bindings }
}
function convert(input: ReturnType<typeof fixture>) {
  return convertBbmodelNativeUvs(
    input.source,
    input.plans,
    input.authorial,
    input.bindings,
    input.appearance,
  )
}
function failure(run: () => unknown, path: string) {
  let error: unknown
  try {
    run()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe('unsupported')
  expect((error as BbmodelInputError).path).toBe(path)
}
function poison(target: object, ...keys: string[]) {
  for (const key of keys)
    Object.defineProperty(target, key, {
      get() {
        throw new Error(`Unexpected read: ${key}`)
      },
    })
}

test.each([
  '4.9',
  '4.10',
  '5.0',
])('bbmodel %s normalizes frame-local UV by logical dimensions and preserves original corner provenance across triangles', (version) => {
  const input = fixture(version),
    before = structuredClone(input),
    result = convert(input),
    face = result.geometries[0]!.faces.get(0)!
  expect(face).toEqual({
    texture: 0,
    corners: [
      [0.125, 0.875],
      [0.375, 0.875],
      [0.375, 0.625],
      [0.125, 0.625],
    ],
  })
  expect(
    input.plans[0]!.faces.map((plan) =>
      plan.corners.map((corner) => face.corners[corner.sourceCorner]),
    ),
  ).toEqual([
    [
      [0.125, 0.875],
      [0.375, 0.875],
      [0.375, 0.625],
    ],
    [
      [0.125, 0.875],
      [0.375, 0.625],
      [0.125, 0.625],
    ],
  ])
  expect(result.issues).toEqual([])
  face.corners[0]![0] = 77
  expect(input).toEqual(before)
  expect(convert(input).geometries[0]!.faces.get(0)!.corners[0]).toEqual([0.125, 0.875])
})

test('bbmodel UV dimensions inherit each axis independently and never use pixel caches, frames, layers or selected texture', () => {
  const input = fixture('5.0', {
    resolution: { width: 32 },
    textures: [{ uuid: 'paint', uv_height: 8, width: 999, height: 777 }],
  })
  poison(input.appearance.textures[0]!, 'width', 'height', 'fps', 'frameOrder', 'layers', 'source')
  expect(bbmodelUvDimensions(input.appearance, 0)).toEqual([32, 8])
  expect(bbmodelUvDimensions(input.appearance, null)).toEqual([32, 16])
  const independent = bbmodelUvDimensions(input.appearance, 0)
  independent[0] = 5
  expect(bbmodelUvDimensions(input.appearance, 0)).toEqual([32, 8])
  input.appearance.textures[0]!.uvWidth = 0.125
  expect(bbmodelUvDimensions(input.appearance, 0)).toEqual([0.125, 8])
  input.appearance.project.uvWidth = null
  expect(bbmodelUvDimensions(input.appearance, null)).toEqual([16, 16])
})

test('bbmodel native UV keeps per-face texture identity and seams, with project dimensions for untextured faces', () => {
  const uv = { a: [8, 4], b: [24, 4], c: [24, 12], d: [8, 12] },
    vertices = ['a', 'b', 'c', 'd'],
    input = fixture('5.0', {
      resolution: { width: 32, height: 16 },
      textures: [
        { uuid: 'paint', uv_width: 64, uv_height: 32 },
        { uuid: 'other', uv_width: 16 },
      ],
      elements: [
        {
          uuid: 'shape',
          type: 'mesh',
          vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [2, 2, 0], d: [0, 2, 0] },
          faces: {
            base: { vertices, uv, texture: 0 },
            seam: { vertices, uv, texture: 'other' },
            plain: { vertices, uv, texture: false },
          },
        },
      ],
    })
  const before = structuredClone(input),
    result = convert(input).geometries[0]!.faces
  expect(result.get(0)!.texture).toBe(0)
  expect(result.get(1)).toEqual({
    texture: 1,
    corners: [
      [0.5, 0.75],
      [1.5, 0.75],
      [1.5, 0.25],
      [0.5, 0.25],
    ],
  })
  expect(result.get(2)).toEqual({
    texture: null,
    corners: [
      [0.25, 0.75],
      [0.75, 0.75],
      [0.75, 0.25],
      [0.25, 0.25],
    ],
  })
  result.get(1)!.corners[0]![0] = 12
  expect(result.get(0)!.corners[0]![0]).toBe(0.125)
  expect(input).toEqual(before)
})

test('bbmodel cube corner rotations reach normalized native UV without changing planned cycles', () => {
  const input = fixture('5.0', {
      elements: [
        {
          uuid: 'shape',
          type: 'cube',
          from: [0, 0, 0],
          to: [2, 2, 2],
          faces: Object.fromEntries(
            BBMODEL_CUBE_DIRECTIONS.map((direction) => [
              direction,
              { uv: [0, 0, 64, 32], rotation: 90, texture: 0 },
            ]),
          ),
        },
      ],
    }),
    before = structuredClone(input),
    result = convert(input)
  expect(result.geometries[0]!.faces.size).toBe(6)
  for (const face of result.geometries[0]!.faces.values())
    expect(face.corners).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ])
  expect(result.issues).toEqual([])
  expect(input).toEqual(before)
  input.authorial[0]!.faces.get(0)![0]![0] = 1e308
  failure(() => convert(input), 'elements[0].faces["north"].uv')
})

test('bbmodel normalized UV reports out-of-frame corners once without wrapping, clamping, padding or counting split triangles twice', () => {
  const input = fixture(),
    values = input.authorial[0]!.faces.get(0)!
  for (const point of values) {
    point[0] = -64
    point[1] = 96
  }
  const before = structuredClone(input),
    result = convert(input)
  expect(result.geometries[0]!.faces.get(0)!.corners).toEqual(Array(4).fill([-1, -2]))
  expect(result.issues).toEqual([
    { code: 'outside-frame-uv', node: 0, path: 'elements[0]', count: 4 },
  ])
  expect(input).toEqual(before)
})

test('bbmodel UV preserves Float64 and signed U zero, rejects GPU overflow and reports arithmetic collapse and sub-Float32 corners', () => {
  const input = fixture('5.0', { textures: [{ uuid: 'paint', uv_width: 1, uv_height: 1 }] }),
    values = input.authorial[0]!.faces.get(0)!
  for (const point of values) {
    point[0] = -0
    point[1] = 0
  }
  expect(Object.is(convert(input).geometries[0]!.faces.get(0)!.corners[0]![0], -0)).toBe(true)
  for (const point of values) {
    point[0] = 1e-46
    point[1] = 1e-50
  }
  const before = structuredClone(input),
    result = convert(input)
  expect(result.geometries[0]!.faces.get(0)!.corners[0]).toEqual([1e-46, 1])
  expect(result.issues).toEqual([
    { code: 'uv-arithmetic-collapse', node: 0, path: 'elements[0]', count: 4 },
    { code: 'sub-float32-uv', node: 0, path: 'elements[0]', count: 4 },
  ])
  expect(input).toEqual(before)
  values[0]![0] = 1e308
  failure(() => convert(input), 'elements[0].faces["q \\" id"].uv["a"]')
  input.appearance.textures[0]!.uvWidth = 1e308
  expect(convert(input).geometries[0]!.faces.get(0)!.corners[0]![0]).toBe(1)
  input.appearance.textures[0]!.uvWidth = 2
  for (const point of values) {
    point[0] = Number.MIN_VALUE
    point[1] = 0
  }
  expect(convert(input).issues).toEqual([
    { code: 'uv-arithmetic-collapse', node: 0, path: 'elements[0]', count: 4 },
  ])
})

test('bbmodel normalization requires matching stages before reading UV values and does not read source geometry or omitted faces', () => {
  const input = fixture()
  poison(input.source[0]!, 'positions', 'origin', 'rotation')
  poison(input.appearance.textures[0]!, 'width', 'height', 'layers', 'fps', 'source')
  expect(convert(input).geometries).toHaveLength(1)
  const unread = fixture()
  for (const point of unread.authorial[0]!.faces.get(0)!) poison(point, '0', '1')
  unread.authorial[0]!.geometryId = 'wrong'
  expect(() => convert(unread)).toThrow('Mismatched bbmodel native UV stages')
  unread.appearance.modelFormat = 'future'
  failure(() => convert(unread), 'meta.model_format')
  input.plans[0]!.faces = []
  poison(input.source[0]!, 'faces')
  expect(convert(input).geometries[0]!.faces.size).toBe(0)
})
