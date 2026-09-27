import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationTrack } from '../scene/animation'
import type { ModelSceneNode, MoldaSceneDocument, SceneMeshGeometry } from '../scene/document'
import { composeTransform, quaternionFromEulerXYZ, transformPoint } from '../scene/matrix'
import { readSceneAnimations } from '../scene/readAnimation'
import { prepareSceneAnimation, sampleSceneAnimationTrack } from '../scene/sampleAnimation'
import { assessBbmodelAnimationBounds as assess } from './bbmodelAnimationBounds'
import { BbmodelInputError } from './bbmodelInput'
import { importDocumentBase } from './importDocumentBase'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function node(
  id: string,
  parentId: string | null = null,
  translation: Vec3 = [0, 0, 0],
): ModelSceneNode {
  return {
    id,
    parentId,
    kind: 'group',
    name: id,
    hidden: false,
    locked: false,
    transform: { kind: 'trs', translation, rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  }
}
function clip(tracks: SceneAnimationTrack[], id = 'clip'): SceneAnimationClip {
  return { id, name: id, duration: 1, fps: 24, loop: false, space: 'local', tracks }
}
function vectorTrack(
  nodeId: string,
  channel: 'translation' | 'scale',
  from: Vec3,
  to: Vec3 = from,
  interpolation: 'linear' | 'step' | 'smooth' = 'linear',
): SceneAnimationTrack {
  return {
    nodeId,
    channel,
    keys: [
      { time: 0, value: [...from], interpolation },
      { time: 1, value: [...to], interpolation },
    ],
  }
}
function geometry(): SceneMeshGeometry {
  return {
    id: 'shape',
    kind: 'mesh',
    vertices: { a: [2, 1, 3], b: [-1, 0, 0], unused: [0, -2, 1] },
    faces: {},
    looseEdges: [],
  }
}
function fixture(tracks: SceneAnimationTrack[] = []) {
  const shape = geometry(),
    nodes: ModelSceneNode[] = [
      node('root'),
      node('child', 'root', [1, 2, 0]),
      { ...node('mesh', 'child'), kind: 'mesh', geometryId: shape.id, materialId: 'mat' },
    ],
    animations = readSceneAnimations([clip(tracks)]),
    document: MoldaSceneDocument = {
      ...importDocumentBase({ id: 'test', name: 'Test', createdAt: 1, updatedAt: 1 }),
      nodes,
      geometries: [shape],
      animations,
      materials: [
        {
          id: 'mat',
          name: 'Mat',
          baseColor: { kind: 'rgba', value: [1, 1, 1, 1] },
          roughness: 1,
          metalness: 0,
          doubleSided: false,
        },
      ],
    }
  return { nodes, shape, animations, document }
}
function failure(fn: () => unknown) {
  try {
    fn()
  } catch (error) {
    if (!(error instanceof BbmodelInputError)) throw error
    return { reason: error.reason, path: error.path }
  }
  throw new Error('Expected a diagnostic')
}

test('conservative envelopes contain dense native poses, including rotation, smooth/step, negative scale and unanimated descendants', () => {
  const input = fixture([
      vectorTrack('root', 'scale', [-2, 1, 0.5], [3, -0.75, 2], 'smooth'),
      vectorTrack('root', 'translation', [-2, 5, 1], [7, -3, 4]),
      {
        nodeId: 'root',
        channel: 'rotation',
        keys: [
          { time: 0, value: quaternionFromEulerXYZ([20, 40, -30]), interpolation: 'linear' },
          { time: 1, value: quaternionFromEulerXYZ([-70, 20, 150]), interpolation: 'linear' },
        ],
      },
      vectorTrack('child', 'translation', [2, -1, 3], [-1, 5, 0], 'step'),
      {
        nodeId: 'child',
        channel: 'rotation',
        keys: [
          { time: 0, value: quaternionFromEulerXYZ([45, 30, 10]), interpolation: 'smooth' },
          { time: 1, value: quaternionFromEulerXYZ([10, -80, 35]), interpolation: 'linear' },
        ],
      },
    ]),
    before = structuredClone(input),
    report = at(assess(input.nodes, [input.shape], input.animations)),
    player = prepareSceneAnimation(input.document, 'clip')
  for (let frame = 0; frame <= 256; frame++) {
    const pose = player.sample(frame / 256)
    for (const matrix of pose.worldMatrices.values()) {
      for (const offset of [0, 4, 8])
        expect(
          Math.hypot(matrix[offset] ?? 0, matrix[offset + 1] ?? 0, matrix[offset + 2] ?? 0),
        ).toBeLessThanOrEqual(report.maximumScaleBound)
      expect(Math.hypot(matrix[12], matrix[13], matrix[14])).toBeLessThanOrEqual(
        report.maximumTranslationBound,
      )
    }
    const mesh = pose.worldMatrices.get('mesh')
    if (!mesh) throw new Error('Missing fixture mesh pose')
    for (const point of Object.values(input.shape.vertices))
      expect(Math.hypot(...transformPoint(mesh, point))).toBeLessThanOrEqual(
        report.maximumPointBound,
      )
  }
  expect(input).toEqual(before)
  expect(report).toMatchObject({ clipId: 'clip', method: 'conservative-local-trs', nodes: 3 })
})

test('local finite scales can overflow together, and geometry/unanimated children cannot bypass the guard', () => {
  const scales = fixture([
    vectorTrack('root', 'scale', [1, 1, 1], [1e20, 1e20, 1e20]),
    vectorTrack('child', 'scale', [1, 1, 1], [1e20, 1e20, 1e20]),
  ])
  expect(Number.isFinite(Math.fround(1e20))).toBe(true)
  expect(failure(() => assess(scales.nodes, [scales.shape], scales.animations))).toEqual({
    reason: 'unsupported',
    path: 'native.animations["clip"].nodes["child"].scale',
  })
  const points = fixture([vectorTrack('root', 'scale', [1, 1, 1], [1e20, 1e20, 1e20])])
  points.shape.vertices.unused = [1e20, 0, 0]
  expect(failure(() => assess(points.nodes, [points.shape], points.animations))).toEqual({
    reason: 'unsupported',
    path: 'native.animations["clip"].nodes["mesh"].points',
  })
  const translation = fixture([
    vectorTrack('root', 'scale', [1e20, 1e20, 1e20]),
    vectorTrack('child', 'translation', [1e20, 0, 0]),
  ])
  expect(
    failure(() => assess(translation.nodes, [translation.shape], translation.animations)),
  ).toEqual({ reason: 'unsupported', path: 'native.animations["clip"].nodes["child"].translation' })
})

test('checking only authorial rotation endpoints would miss a draw-range overflow between them', () => {
  const rotations: SceneAnimationTrack = {
      nodeId: 'root',
      channel: 'rotation',
      keys: [
        { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
        { time: 1, value: quaternionFromEulerXYZ([0, 0, 90]), interpolation: 'linear' },
      ],
    },
    input = fixture([rotations]),
    point: Vec3 = [2.5e38, 2.5e38, 0]
  input.shape.vertices.a = point
  function atTime(time: number) {
    const rotation = sampleSceneAnimationTrack(rotations, time)
    if (rotation.length !== 4) throw new Error('Expected fixture rotation')
    return transformPoint(
      composeTransform({ kind: 'trs', translation: [0, 0, 0], rotation, scale: [1, 1, 1] }),
      point,
    )
  }
  expect(atTime(0).every((value) => Number.isFinite(Math.fround(value)))).toBe(true)
  expect(atTime(1).every((value) => Number.isFinite(Math.fround(value)))).toBe(true)
  expect(atTime(0.5).some((value) => !Number.isFinite(Math.fround(value)))).toBe(true)
  expect(failure(() => assess(input.nodes, [input.shape], input.animations)).path).toEndWith(
    '.points',
  )
})

test('conservative rejection is not proof of actual overflow in cancelling or correlated poses', () => {
  const input = fixture([
      vectorTrack('root', 'translation', [2e38, 0, 0]),
      vectorTrack('child', 'translation', [-2e38, 0, 0]),
    ]),
    player = prepareSceneAnimation(input.document, 'clip'),
    pose = player.sample(0.5),
    child = pose.worldMatrices.get('child')
  if (!child) throw new Error('Missing fixture child')
  expect(child[12]).toBe(0)
  expect(failure(() => assess(input.nodes, [input.shape], input.animations)).path).toEndWith(
    '.translation',
  )
})

test('clips are independent: maxima from separate motions are never multiplied together', () => {
  const input = fixture(),
    clips = readSceneAnimations([
      clip([vectorTrack('root', 'scale', [1e20, 1e20, 1e20])], 'first'),
      clip([vectorTrack('child', 'scale', [1e20, 1e20, 1e20])], 'second'),
    ]),
    reports = assess(input.nodes, [input.shape], clips)
  expect(reports.map((report) => report.clipId)).toEqual(['first', 'second'])
  for (const report of reports) expect(report.maximumScaleBound).toBeLessThan(1.001e20)
  at(reports).maximumPointBound = 0
  expect(reports[1]?.maximumPointBound).toBeGreaterThan(0)
})

test('zero scale collapses descendant bounds while positive subnormal products are rounded outwards', () => {
  const zero = fixture([vectorTrack('root', 'scale', [0, 0, 0])]),
    report = at(assess(zero.nodes, [zero.shape], zero.animations))
  expect(report.maximumScaleBound).toBe(0)
  expect(report.maximumPointBound).toBe(0)
  const tiny = fixture([
    vectorTrack('root', 'scale', [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE]),
    vectorTrack('child', 'scale', [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE]),
  ])
  const child = at(tiny.nodes, 1)
  if (child.transform.kind !== 'trs') throw new Error('Expected fixture TRS')
  child.transform.translation = [0, 0, 0]
  tiny.shape.vertices.a = [1e38, 0, 0]
  const before = structuredClone(tiny),
    bound = at(assess(tiny.nodes, [tiny.shape], tiny.animations))
  expect(bound.maximumScaleBound).toBeGreaterThan(0)
  expect(Number.isFinite(bound.maximumScaleBound)).toBe(true)
  expect(bound.maximumPointBound).toBeGreaterThan(1e-300)
  expect(tiny).toEqual(before)
})

test('the envelope includes the native unit-quaternion tolerance, not only ideal rotations', () => {
  const input = fixture(),
    root = at(input.nodes)
  if (root.transform.kind !== 'trs') throw new Error('Expected fixture TRS')
  root.transform.rotation = [0, 0, 1 + 9e-7, 0]
  const matrix = composeTransform(root.transform),
    report = at(assess(input.nodes, [input.shape], input.animations))
  expect(Math.abs(matrix[0])).toBeGreaterThan(1)
  expect(Math.abs(matrix[0])).toBeLessThanOrEqual(report.maximumScaleBound)
})

test('deep rotated unit-scale hierarchies do not accumulate a per-node Frobenius factor', () => {
  const nodes = Array.from({ length: 128 }, (_, i) => {
      const item = node(`node_${i}`, i === 0 ? null : `node_${i - 1}`)
      if (item.transform.kind !== 'trs') throw new Error('Expected fixture TRS')
      item.transform.rotation = quaternionFromEulerXYZ([45, 25, -10])
      return item
    }),
    report = at(assess(nodes, [], [clip([])]))
  expect(report.maximumScaleBound).toBeGreaterThanOrEqual(1)
  expect(report.maximumScaleBound).toBeLessThan(1.001)
  expect(report.maximumPointBound).toBe(0)
})

test('mesh coordinates are scanned once across many clips; no FPS or frame schedule is read', () => {
  const input = fixture(),
    point = input.shape.vertices.a
  if (!point) throw new Error('Missing fixture point')
  let reads = 0
  Object.defineProperty(point, '0', {
    get() {
      reads++
      return 2
    },
  })
  const clips = Array.from({ length: 64 }, (_, i) => {
    const item = clip([], `clip_${i}`)
    Object.defineProperty(item, 'fps', {
      get() {
        throw new Error('Unexpected frame schedule read')
      },
    })
    return item
  })
  expect(assess(input.nodes, [input.shape], clips).length).toBe(64)
  expect(reads).toBe(1)
})

test('affine bases and local-delta are not silently approximated; static imports need no animated analysis', () => {
  const input = fixture(),
    root = at(input.nodes)
  root.transform = { kind: 'affine', matrix: composeTransform(root.transform) }
  expect(failure(() => assess(input.nodes, [input.shape], input.animations)).path).toBe(
    'native.nodes["root"]',
  )
  expect(assess(input.nodes, [input.shape], [])).toEqual([])
  root.transform = node('unused').transform
  at(input.animations).space = 'local-delta'
  expect(failure(() => assess(input.nodes, [input.shape], input.animations)).path).toBe(
    'native.animations["clip"].space',
  )
})

test('unsupported range modes fail before walking any geometry values', () => {
  const input = fixture(),
    root = at(input.nodes)
  Object.defineProperty(input.shape, 'vertices', {
    get() {
      throw new Error('Geometry was read before mode validation')
    },
  })
  root.transform = { kind: 'affine', matrix: composeTransform(root.transform) }
  expect(failure(() => assess(input.nodes, [input.shape], input.animations)).path).toBe(
    'native.nodes["root"]',
  )
  root.transform = node('unused').transform
  at(input.animations).space = 'local-delta'
  expect(failure(() => assess(input.nodes, [input.shape], input.animations)).path).toBe(
    'native.animations["clip"].space',
  )
})
