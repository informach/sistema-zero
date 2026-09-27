import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import type { SceneMeshGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { identityMatrix } from './matrix'
import { bindSceneSkin } from './skinBinding'
import { prepareSceneSkinDraw, type SceneSkinDraw, sceneSkinDrawBounds } from './skinDraw'
import { prepareSceneSkin } from './skinPose'

test('skin draw attributes follow the existing expanded corner map, preserve UV seams and exclude omitted faces/loose points', () => {
  const { document, input } = makeSceneSkinFixture(),
    geometry = document.geometries[0] as SceneMeshGeometry
  geometry.faces.dead = {
    corners: Array.from({ length: 3 }, () => ({ vertexId: 'v_0_0', uv: [0, 0] })),
  }
  geometry.vertices.loose = [99, 99, 99]
  input.weights.loose = [{ jointId: 'upper', weight: 1 }]
  const before = structuredClone({ document, input }),
    prepared = prepareSceneSkin(document, bindSceneSkin(document, input)),
    buffers = buildSceneGeometry(geometry),
    draw = prepareSceneSkinDraw(prepared, geometry, buffers)
  expect(buffers.issues).toEqual([{ faceId: 'dead', code: 'degenerate' }])
  expect(draw.indices).toHaveLength((buffers.positions.length / 3) * 4)
  expect(
    draw.clusters.every(
      (cluster) => cluster === null || cluster.max.every((value) => value <= 0.25),
    ),
  ).toBe(true)
  for (let vertex = 0; vertex < buffers.cornerIndices.length; vertex++) {
    const face = geometry.faces[buffers.faceIds[Math.floor(vertex / 3)]!]!,
      id = face.corners[buffers.cornerIndices[vertex]!]!.vertexId,
      weights = input.weights[id]!
    expect([...draw.weights.slice(vertex * 4, vertex * 4 + 4)]).toEqual([
      Math.fround(weights[0]!.weight),
      Math.fround(weights[1]!.weight),
      0,
      0,
    ])
    expect([...draw.indices.slice(vertex * 4, vertex * 4 + 4)]).toEqual([0, 1, 0, 0])
  }
  expect({ document, input }).toEqual(before)
})

test('draw preparation refuses a stale corner/position mapping and positive influences that vanish in Float32', () => {
  const { document, input } = makeSceneSkinFixture(),
    geometry = document.geometries[0] as SceneMeshGeometry,
    prepared = prepareSceneSkin(document, bindSceneSkin(document, input)),
    buffers = buildSceneGeometry(geometry)
  expect(() =>
    prepareSceneSkinDraw(prepared, geometry, { ...buffers, cornerIndices: new Uint32Array(1) }),
  ).toThrow('cantos')
  const positions = buffers.positions.slice()
  positions[0] = 99
  expect(() => prepareSceneSkinDraw(prepared, geometry, { ...buffers, positions })).toThrow(
    'outro desenho',
  )
  expect(() => prepareSceneSkinDraw(prepared, { ...geometry, faces: {} }, buffers)).toThrow(
    'fora do vínculo',
  )
  input.weights.v_0_0![0]!.weight = Number.MIN_VALUE
  const tiny = prepareSceneSkin(document, bindSceneSkin(document, input))
  expect(() => prepareSceneSkinDraw(tiny, geometry, buffers)).toThrow('perder seu osso')
  expect(input.weights.v_0_0![0]!.weight).toBe(Number.MIN_VALUE)
})

test('joint-cluster bounds enclose Float32 weighted shader arithmetic under reflections, cancellation and weight sum error', () => {
  const weights = new Float32Array([0.33333334, 0.6666667]),
    draw: SceneSkinDraw = {
      indices: new Uint16Array(),
      weights,
      clusters: [
        { min: [-12345, -2, 0], max: [12345, 3, 1] },
        { min: [-12345, -2, 0], max: [12345, 3, 1] },
      ],
      maximumWeightError: Math.abs(weights[0]! + weights[1]! - 1),
    },
    f = Math.fround
  for (let sample = 0; sample <= 150; sample++) {
    const time = sample / 150,
      palette = new Float64Array([...identityMatrix(), ...identityMatrix()])
    for (let joint = 0; joint < 2; joint++) {
      const offset = joint * 16
      palette[offset] = Math.cos(time * 3 + joint) * 9
      palette[offset + 4] = Math.sin(time * 6 + joint) * 20000
      palette[offset + 12] = -time * 100000
      palette[offset + 5] = 1 - 2 * time
      palette[offset + 9] = time * 123
      palette[offset + 14] = 10 * joint * time
    }
    const bounds = sceneSkinDrawBounds(draw, palette)!
    for (const x of [-12345, -15, 0, 12345])
      for (const y of [-2, 0.123, 3])
        for (const z of [0, 0.5, 1]) {
          for (let axis = 0; axis < 3; axis++) {
            let value = 0
            for (let joint = 0; joint < 2; joint++) {
              const offset = joint * 16 + axis,
                transformed = f(
                  f(f(f(palette[offset]!) * f(x)) + f(f(palette[offset + 4]!) * f(y))) +
                    f(f(palette[offset + 8]!) * f(z)),
                )
              const translated = f(transformed + f(palette[offset + 12]!))
              value = f(value + f(translated * weights[joint]!))
            }
            expect(value >= bounds.min[axis]! && value <= bounds.max[axis]!).toBe(true)
          }
        }
  }
  expect(sceneSkinDrawBounds({ ...draw, clusters: [null, null] }, new Float64Array(32))).toBeNull()
  expect(() => sceneSkinDrawBounds(draw, new Float64Array(16))).toThrow('esqueleto')
  const huge = new Float64Array([...identityMatrix(), ...identityMatrix()])
  huge[0] = 3e38
  expect(() => sceneSkinDrawBounds(draw, huge)).toThrow('precisão')
})
