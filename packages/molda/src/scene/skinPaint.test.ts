import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { indexSceneDocument } from './documentIndex'
import { transformPoint } from './matrix'
import { addSceneSkinJoint, createSceneSkin, setSceneSkinWeights } from './skinCommands'
import { createSceneSkinPaintStroke, type SceneSkinPaintSettings } from './skinPaint'

function setup() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    asset = createSceneSkin(document, input, () => id),
    matrix = indexSceneDocument(asset).scene.worldMatrices.get(input.nodeId)!,
    geometry = asset.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Malha esperada')
  const point = (id: string) => transformPoint(matrix, geometry.vertices[id]!)
  return { asset, geometry, point }
}
const settings: SceneSkinPaintSettings = { mode: 'add', radius: 0.1, strength: 0.25 }

test('partial strength cannot round a positive influence to zero or silently become full coverage', () => {
  const { asset, point } = setup()
  for (const mode of ['add', 'subtract'] as const) {
    const previous = mode === 'add' ? 1 - Number.EPSILON / 2 : Number.MIN_VALUE,
      source = setSceneSkinWeights(asset, 'skin', {
        v_0_0: [
          { jointId: 'upper', weight: previous },
          { jointId: 'lower', weight: 1 - previous },
        ],
      }),
      stroke = createSceneSkinPaintStroke(source, 'skin', 'upper', {
        ...settings,
        mode,
        strength: 0.75,
      })
    expect(stroke.sample({ faceId: 'f_0_0', point: point('v_0_0') }).stats.refused.precision).toBe(
      1,
    )
    expect(stroke.result().patch).toEqual({})
    const explicit = createSceneSkinPaintStroke(source, 'skin', 'upper', {
      ...settings,
      mode,
      strength: 1,
    })
    explicit.sample({ faceId: 'f_0_0', point: point('v_0_0') })
    expect(explicit.result().patch.v_0_0![0]!.weight).toBe(mode === 'add' ? 1 : 0)
  }
})

test('a detached stroke uses maximum coverage, owns its output and changes only the targeted binding with an explicit command', () => {
  const { asset: source, geometry, point } = setup(),
    asset = createSceneSkin(
      { ...source, nodes: [...source.nodes, { ...source.nodes[0]!, id: 'copy' }] },
      {
        name: 'Outro vínculo',
        nodeId: 'copy',
        jointIds: ['upper', 'lower'],
        weights: source.skins![0]!.weights,
      },
      () => 'other-skin',
    ),
    before = structuredClone(asset),
    stroke = createSceneSkinPaintStroke(asset, 'skin', 'upper', settings),
    sample = { faceId: 'f_0_0', point: point('v_0_0') }
  const first = stroke.sample(sample)
  expect([...first.delta]).toEqual([['v_0_0', 0.25]])
  expect(first.stats).toEqual({
    touched: 1,
    changed: 1,
    refused: { 'influence-limit': 0, 'no-recipient': 0, precision: 0 },
  })
  first.delta.set('v_0_0', 0.9)
  for (let i = 0; i < 30; i++) expect(stroke.sample(sample).delta.size).toBe(0)
  const exported = stroke.result()
  exported.patch.v_0_0![0]!.weight = 0.9
  const result = stroke.result()
  expect(result.patch.v_0_0).toEqual([
    { jointId: 'upper', weight: 0.25 },
    { jointId: 'lower', weight: 0.75 },
  ])
  const next = setSceneSkinWeights(asset, 'skin', result.patch)
  expect(next.geometries[0]).toBe(geometry)
  expect(next.nodes).toBe(asset.nodes)
  expect(next.skins![0]!.joints).toBe(asset.skins![0]!.joints)
  expect(next.skins![0]!.weights.v_1_0).toBe(asset.skins![0]!.weights.v_1_0)
  expect(next.skins![1]).toBe(asset.skins![1])
  expect(asset).toEqual(before)
})

test('a surface stroke cannot cross a loose construction edge into a coincident disconnected face', () => {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    geometry = document.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Malha esperada')
  const originalIds = Object.keys(geometry.vertices)
  for (const vertexId of originalIds) {
    geometry.vertices[`copy-${vertexId}`] = [...geometry.vertices[vertexId]!]
    input.weights[`copy-${vertexId}`] = [{ jointId: 'lower', weight: 1 }]
  }
  geometry.faces.separate = {
    ...geometry.faces.f_0_0!,
    corners: geometry.faces.f_0_0!.corners.map((corner) => ({
      ...corner,
      vertexId: `copy-${corner.vertexId}`,
    })),
  }
  geometry.looseEdges = [['v_0_0', 'copy-v_0_0']]
  const asset = createSceneSkin(document, input, () => id),
    stroke = createSceneSkinPaintStroke(asset, id, 'upper', { ...settings, radius: 20 }),
    world = indexSceneDocument(asset).scene.worldMatrices.get(input.nodeId)!,
    result = stroke.sample({
      faceId: 'f_0_0',
      point: transformPoint(world, geometry.vertices.v_0_0!),
    })
  expect([...result.delta.keys()].sort()).toEqual(originalIds.filter((id) => id !== 'v_1_1').sort())
  expect(result.stats.touched).toBe(4)
  expect(Object.keys(stroke.result().patch).every((id) => !id.startsWith('copy-'))).toBe(true)
})

test('refusal counts track the latest coverage and recover only when an explicit full weight is representable', () => {
  const { asset: source, point } = setup()
  let asset = source
  for (const joint of ['rig', 'third', 'fourth']) {
    if (joint !== 'rig')
      asset = {
        ...asset,
        nodes: [...asset.nodes, { ...asset.nodes.find((node) => node.id === 'lower')!, id: joint }],
      }
    asset = addSceneSkinJoint(asset, 'skin', joint)
  }
  asset = setSceneSkinWeights(asset, 'skin', {
    v_0_0: [
      { jointId: 'upper', weight: 0 },
      { jointId: 'lower', weight: 1 },
      { jointId: 'rig', weight: Number.MIN_VALUE },
    ],
    v_1_0: [
      { jointId: 'lower', weight: 1 },
      { jointId: 'rig', weight: 0 },
      { jointId: 'third', weight: 0 },
      { jointId: 'fourth', weight: 0 },
    ],
  })
  const stroke = createSceneSkinPaintStroke(asset, 'skin', 'upper', { ...settings, strength: 1 }),
    center = point('v_0_0'),
    sample = {
      faceId: 'f_0_0',
      point: [center[0] + 0.01, center[1], center[2]] as [number, number, number],
    }
  expect(
    stroke.sample({ faceId: 'f_0_0', point: [center[0] + 0.095, center[1], center[2]] }).stats
      .changed,
  ).toBe(1)
  const first = stroke.sample(sample)
  expect(first.stats.refused.precision).toBe(1)
  expect(first.delta.get('v_0_0')).toBe(0)
  expect(first.stats.changed).toBe(0)
  expect(stroke.sample(sample).stats.refused.precision).toBe(1)
  expect(stroke.sample({ faceId: 'f_0_0', point: center }).stats.refused.precision).toBe(0)
  expect(stroke.result().patch.v_0_0).toEqual([
    { jointId: 'upper', weight: 1 },
    { jointId: 'lower', weight: 0 },
    { jointId: 'rig', weight: 0 },
  ])
  const refusal = stroke.sample({ faceId: 'f_0_0', point: point('v_1_0') })
  expect(refusal.stats.refused['influence-limit']).toBe(1)
  expect(stroke.result().patch.v_1_0).toBeUndefined()
  expect(asset.skins![0]!.weights.v_0_0![2]!.weight).toBe(Number.MIN_VALUE)
})

test('greater coverage replaces the first preview instead of accumulating pressure from repeated samples', () => {
  const { asset, point } = setup(),
    stroke = createSceneSkinPaintStroke(asset, 'skin', 'upper', { ...settings, strength: 1 }),
    center = point('v_0_0')
  const first = stroke.sample({ faceId: 'f_0_0', point: [center[0] + 0.05, center[1], center[2]] })
  expect(first.delta.get('v_0_0')).toBeCloseTo(0.5, 12)
  expect(stroke.sample({ faceId: 'f_0_0', point: center }).delta.get('v_0_0')).toBe(1)
  expect(stroke.result().patch.v_0_0).toEqual([
    { jointId: 'upper', weight: 1 },
    { jointId: 'lower', weight: 0 },
  ])
})

test('refused points keep their original rows; invalid or zero-strength samples cannot leave a partial draft', () => {
  const { asset, point } = setup(),
    single = setSceneSkinWeights(asset, 'skin', { v_0_0: [{ jointId: 'lower', weight: 1 }] }),
    stroke = createSceneSkinPaintStroke(single, 'skin', 'lower', { ...settings, mode: 'subtract' })
  expect(
    stroke.sample({ faceId: 'f_0_0', point: point('v_0_0') }).stats.refused['no-recipient'],
  ).toBe(1)
  expect(stroke.result().patch).toEqual({})
  const before = stroke.result()
  expect(() => stroke.sample({ faceId: 'missing', point: point('v_0_0') })).toThrow()
  expect(() => stroke.sample({ faceId: 'f_0_0', point: [NaN, 0, 0] })).toThrow()
  expect(stroke.result()).toEqual(before)
  const zero = createSceneSkinPaintStroke(asset, 'skin', 'upper', { ...settings, strength: 0 })
  expect(zero.sample({ faceId: 'f_0_0', point: point('v_0_0') }).delta.size).toBe(0)
  expect(zero.result().patch).toEqual({})
  for (const radius of [0, -1, Infinity, NaN])
    expect(() =>
      createSceneSkinPaintStroke(asset, 'skin', 'upper', { ...settings, radius }),
    ).toThrow()
  expect(() => createSceneSkinPaintStroke(asset, 'skin', 'missing', settings)).toThrow()
  expect(() =>
    createSceneSkinPaintStroke(
      {
        ...asset,
        nodes: asset.nodes.map((node) => (node.id === 'rig' ? { ...node, locked: true } : node)),
      },
      'skin',
      'upper',
      settings,
    ),
  ).toThrow('destrave')
})
