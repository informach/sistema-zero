import { expect, test } from 'bun:test'
import { Line3, Vector3 } from 'three'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import type { SceneMeshGeometry } from './document'
import { indexSceneDocument } from './documentIndex'
import { identityMatrix } from './matrix'
import { createSceneSkin } from './skinCommands'
import { deformSceneSkin, prepareSceneSkin } from './skinPose'
import { prepareSceneSkinSuggestion, suggestSceneSkinWeights } from './skinSuggestion'

function fixture() {
  const { document } = makeSceneSkinFixture()
  document.nodes = document.nodes.map((node) => ({
    ...node,
    transform: { kind: 'affine', matrix: identityMatrix() },
  }))
  document.nodes.find((node) => node.id === 'lower')!.transform = {
    kind: 'trs',
    translation: [0, 2, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  }
  const geometry = document.geometries[0] as SceneMeshGeometry
  geometry.vertices = {
    v_0_0: [0.1, 0.5, 0],
    v_1_0: [0.2, 1.5, 0],
    v_0_1: [0.1, 2.5, 0],
    v_1_1: [0.2, -0.5, 0],
  }
  return document
}

test('segment suggestion gives endpoint weights in world space and rigid mode chooses one joint; no source data is changed', () => {
  const document = fixture(),
    before = structuredClone(document),
    input = { nodeId: 'part-0', jointIds: ['upper', 'lower'], method: 'segments' as const },
    prepared = prepareSceneSkinSuggestion(document, input),
    result = suggestSceneSkinWeights(prepared)
  expect(result.weights).toEqual({
    v_0_0: [
      { jointId: 'upper', weight: 0.75 },
      { jointId: 'lower', weight: 0.25 },
    ],
    v_1_0: [
      { jointId: 'upper', weight: 0.25 },
      { jointId: 'lower', weight: 0.75 },
    ],
    v_0_1: [{ jointId: 'lower', weight: 1 }],
    v_1_1: [{ jointId: 'upper', weight: 1 }],
  })
  expect(result.stats).toEqual({ vertices: 4, joints: 2, segments: 1, maximumInfluences: 2 })
  const rigid = suggestSceneSkinWeights(
    prepareSceneSkinSuggestion(document, { ...input, method: 'rigid' }),
  )
  expect(rigid.weights.v_0_0).toEqual([{ jointId: 'upper', weight: 1 }])
  expect(rigid.weights.v_1_0).toEqual([{ jointId: 'lower', weight: 1 }])
  expect(rigid.stats.maximumInfluences).toBe(1)
  expect(input.jointIds).toEqual(['upper', 'lower'])
  expect(document).toEqual(before)
  const bound = createSceneSkin(
    document,
    { nodeId: input.nodeId, jointIds: [...input.jointIds], name: 'Braço', weights: result.weights },
    () => 'skin',
  )
  expect(bound.skins![0]!.weights).toEqual(result.weights)
  expect(bound.skins![0]!.weights).not.toBe(result.weights)
})

test('prepared suggestions own all positions and resolve selected ancestors across intermediate groups', () => {
  const document = fixture(),
    node = document.nodes.find((node) => node.id === 'lower')!
  document.nodes.push({
    ...document.nodes.find((node) => node.id === 'upper')!,
    id: 'between',
    parentId: 'upper',
  })
  node.parentId = 'between'
  const input = { nodeId: 'part-0', jointIds: ['upper', 'lower'], method: 'segments' as const },
    prepared = prepareSceneSkinSuggestion(document, input),
    before = structuredClone(prepared)
  expect(prepared.joints.find((joint) => joint.nodeId === 'lower')!.parentId).toBe('upper')
  const geometry = document.geometries[0] as SceneMeshGeometry
  geometry.vertices.v_0_0![1] = 99
  node.transform = { kind: 'affine', matrix: identityMatrix() }
  expect(prepared).toEqual(before)
  const reversed = prepareSceneSkinSuggestion(fixture(), { ...input, jointIds: ['lower', 'upper'] })
  expect(suggestSceneSkinWeights(reversed)).toEqual(suggestSceneSkinWeights(before))
})

test('affine/reflected scenes agree with an independent Three line projection and suggestion binding preserves rest geometry', () => {
  for (let i = 0; i < 30; i++) {
    const document = fixture(),
      matrix = identityMatrix()
    matrix[0] = -1 - i / 10
    matrix[4] = i / 15
    matrix[5] = 0.5 + i / 10
    matrix[12] = i / 3
    document.nodes.find((node) => node.id === 'rig')!.transform = { kind: 'affine', matrix }
    const prepared = prepareSceneSkinSuggestion(document, {
        nodeId: 'part-0',
        jointIds: ['lower', 'upper'],
        method: 'segments',
      }),
      result = suggestSceneSkinWeights(prepared),
      start = new Vector3(...prepared.joints.find((joint) => joint.nodeId === 'upper')!.position),
      end = new Vector3(...prepared.joints.find((joint) => joint.nodeId === 'lower')!.position),
      line = new Line3(start, end)
    for (const [vertex, id] of prepared.vertexIds.entries()) {
      const point = new Vector3().fromArray(prepared.positions, vertex * 3),
        t = line.closestPointToPointParameter(point, true),
        weights = result.weights[id]!
      expect(weights.find((row) => row.jointId === 'lower')?.weight ?? 0).toBeCloseTo(t, 12)
      expect(weights.find((row) => row.jointId === 'upper')?.weight ?? 0).toBeCloseTo(1 - t, 12)
    }
    const bound = createSceneSkin(
        document,
        { nodeId: 'part-0', name: 'Braço', jointIds: ['upper', 'lower'], weights: result.weights },
        () => 'skin',
      ),
      skin = prepareSceneSkin(bound, bound.skins![0]!),
      positions = deformSceneSkin(skin, indexSceneDocument(bound).scene.worldMatrices)
    for (let j = 0; j < positions.length; j++)
      expect(positions[j]!).toBeCloseTo(skin.positions[j]!, 12)
  }
})

test('suggestion rejects locked/linked/invalid targets and impossible distances instead of changing or repairing input', () => {
  const document = fixture(),
    original = structuredClone(document),
    input = { nodeId: 'part-0', jointIds: ['upper', 'lower'], method: 'segments' as const }
  for (const patch of [
    { jointIds: [] },
    { jointIds: ['upper', 'upper'] },
    { jointIds: ['part-0'] },
    { nodeId: 'upper' },
    { extra: true },
  ])
    expect(() => prepareSceneSkinSuggestion(document, { ...input, ...patch })).toThrow()
  const locked = {
    ...document,
    nodes: document.nodes.map((node) => (node.id === 'rig' ? { ...node, locked: true } : node)),
  }
  expect(() => prepareSceneSkinSuggestion(locked, input)).toThrow('Destrave')
  const weights = suggestSceneSkinWeights(prepareSceneSkinSuggestion(document, input)).weights,
    bound = createSceneSkin(
      document,
      { name: 'Braço', nodeId: input.nodeId, jointIds: [...input.jointIds], weights },
      () => 'skin',
    )
  expect(() => prepareSceneSkinSuggestion(bound, input)).toThrow('já tem pesos')
  const huge = prepareSceneSkinSuggestion(document, input)
  huge.positions[0] = Number.MAX_VALUE
  for (const joint of huge.joints) joint.position[0] = -Number.MAX_VALUE
  expect(() => suggestSceneSkinWeights(huge)).toThrow('precisão')
  const tiny = prepareSceneSkinSuggestion(document, input)
  tiny.positions[0] = 0
  tiny.positions[1] = 1e-100
  expect(() => suggestSceneSkinWeights(tiny)).toThrow('pequena demais')
  expect(suggestSceneSkinWeights({ ...tiny, method: 'rigid' }).weights.v_0_0).toEqual([
    { jointId: 'upper', weight: 1 },
  ])
  expect(document).toEqual(original)
})

test('coincident joints have stable ASCII ties and prototype-like vertex IDs stay own data', () => {
  const document = fixture(),
    geometry = document.geometries[0] as SceneMeshGeometry
  document.nodes.find((node) => node.id === 'lower')!.transform = {
    kind: 'affine',
    matrix: identityMatrix(),
  }
  geometry.vertices = { ...geometry.vertices, ['__proto__']: [0.5, 0.5, 0] }
  const result = suggestSceneSkinWeights(
    prepareSceneSkinSuggestion(document, {
      nodeId: 'part-0',
      jointIds: ['upper', 'lower'],
      method: 'segments',
    }),
  )
  expect(Object.hasOwn(result.weights, '__proto__')).toBe(true)
  expect(result.weights.__proto__).toEqual([{ jointId: 'lower', weight: 1 }])
  expect(result.stats.segments).toBe(0)
  expect(result.stats.maximumInfluences).toBe(1)
})
