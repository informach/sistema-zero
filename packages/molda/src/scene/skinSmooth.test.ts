import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { indexSceneDocument } from './documentIndex'
import { transformPoint } from './matrix'
import { readSceneDocument } from './readDocument'
import type { SceneSkinInfluence } from './skin'
import { createSceneSkin, SCENE_SKIN_SMOOTH, smoothSceneSkinWeightsCommand } from './skinCommands'
import { createSceneSkinPaintStroke } from './skinPaint'
import { sceneMeshVertexNeighbors, smoothSceneSkinRow, smoothSceneSkinRows } from './skinSmooth'
import { SceneValidationError } from './validation'

const row = (pairs: Record<string, number>): SceneSkinInfluence[] =>
  Object.entries(pairs).map(([jointId, weight]) => ({ jointId, weight }))
const total = (rows: readonly SceneSkinInfluence[]) => rows.reduce((n, r) => n + r.weight, 0)

function setup() {
  const {
    document,
    input: { id, ...input },
  } = makeSceneSkinFixture()
  const asset = createSceneSkin(document, input, () => id)
  const mesh = asset.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Mesh expected')
  return { asset, mesh }
}

test('os vizinhos vêm das arestas das faces, sem o próprio ponto', () => {
  const { mesh } = setup()
  const neighbors = sceneMeshVertexNeighbors(mesh)
  for (const [id, list] of neighbors) {
    expect(list).not.toContain(id)
    expect(list).toHaveLength(2)
  }
  expect(neighbors.size).toBe(Object.keys(mesh.vertices).length)
})

test('suavizar anda na direção da média dos vizinhos e mantém o total em 100%', () => {
  const result = smoothSceneSkinRow(row({ a: 1 }), [row({ b: 1 }), row({ a: 0.5, b: 0.5 })], 0.5)
  expect(result.status).toBe('changed')
  if (result.status !== 'changed') return
  const weights = Object.fromEntries(result.influences.map((r) => [r.jointId, r.weight]))
  expect(weights.a).toBeCloseTo(0.625, 12)
  expect(weights.b).toBeCloseTo(0.375, 12)
  expect(total(result.influences)).toBeCloseTo(1, 12)
})

test('suavizar guarda no máximo quatro ossos, os mais fortes', () => {
  const result = smoothSceneSkinRow(
    row({ a: 0.4, b: 0.3, c: 0.2, d: 0.1 }),
    [row({ e: 1 }), row({ f: 0.01, a: 0.99 })],
    0.5,
  )
  expect(result.status).toBe('changed')
  if (result.status !== 'changed') return
  expect(result.influences).toHaveLength(4)
  expect(result.influences.map((r) => r.jointId)).toEqual(['a', 'e', 'b', 'c'])
  expect(total(result.influences)).toBeCloseTo(1, 12)
})

test('ponto sem vizinhos, força zero ou mistura igual à dos vizinhos não muda', () => {
  expect(smoothSceneSkinRow(row({ a: 1 }), [], 1).status).toBe('unchanged')
  expect(smoothSceneSkinRow(row({ a: 1 }), [row({ b: 1 })], 0).status).toBe('unchanged')
  expect(smoothSceneSkinRow(row({ a: 0.5, b: 0.5 }), [row({ b: 0.5, a: 0.5 })], 1).status).toBe(
    'unchanged',
  )
})

test('a ordem dos vizinhos não muda o resultado', () => {
  const neighbors = [row({ a: 0.2, b: 0.8 }), row({ c: 1 }), row({ b: 0.3, c: 0.7 })]
  const one = smoothSceneSkinRow(row({ a: 1 }), neighbors, 0.7)
  const other = smoothSceneSkinRow(row({ a: 1 }), [...neighbors].reverse(), 0.7)
  expect(one).toEqual(other)
})

test('as passadas mexem só nos pontos escolhidos; os outros servem de vizinhos', () => {
  const { asset, mesh } = setup()
  const skin = asset.skins![0]!
  const { patch } = smoothSceneSkinRows(mesh, skin.weights, ['v_0_0'], SCENE_SKIN_SMOOTH)
  expect(Object.keys(patch)).toEqual(['v_0_0'])
  expect(total(patch.v_0_0!)).toBeCloseTo(1, 12)
})

test('o comando suaviza, devolve um passo válido e pode ser desfeito', () => {
  const { asset } = setup()
  const before = structuredClone(asset)
  const result = smoothSceneSkinWeightsCommand(asset, 'skin', ['v_0_0', 'v_1_1'])
  expect(result.changed).toBe(2)
  expect(result.document).not.toBe(asset)
  expect(asset).toEqual(before)
  expect(readSceneDocument(result.document).status).toBe('valid')
  const weights = result.document.skins![0]!.weights
  expect(weights.v_1_0).toEqual(asset.skins![0]!.weights.v_1_0!)
  const lower = (id: string) => weights[id]!.find((r) => r.jointId === 'lower')?.weight ?? 0
  const lowerBefore = (id: string) =>
    asset.skins![0]!.weights[id]!.find((r) => r.jointId === 'lower')?.weight ?? 0
  // v_0_0 começa todo no "lower" e v_1_1 sem ele: os dois se aproximam do meio.
  expect(lower('v_0_0')).toBeLessThan(lowerBefore('v_0_0'))
  expect(lower('v_1_1')).toBeGreaterThan(lowerBefore('v_1_1'))
})

test('o comando recusa pontos de fora da peça e peça travada', () => {
  const { asset } = setup()
  expect(() => smoothSceneSkinWeightsCommand(asset, 'skin', ['outro'])).toThrow(
    SceneValidationError,
  )
  expect(() => smoothSceneSkinWeightsCommand(asset, 'skin', [])).toThrow(SceneValidationError)
  const locked = {
    ...asset,
    nodes: asset.nodes.map((n) => (n.id === 'part-0' ? { ...n, locked: true } : n)),
  }
  expect(() => smoothSceneSkinWeightsCommand(locked, 'skin', ['v_0_0'])).toThrow(
    SceneValidationError,
  )
})

test('o pincel no modo Suavizar mistura com os vizinhos e não acumula no mesmo traço', () => {
  const { asset, mesh } = setup()
  const matrix = indexSceneDocument(asset).scene.worldMatrices.get('part-0')!
  const sample = { faceId: 'f_0_0', point: transformPoint(matrix, mesh.vertices.v_0_0!) }
  const stroke = createSceneSkinPaintStroke(asset, 'skin', 'upper', {
    mode: 'smooth',
    radius: 0.01,
    strength: 1,
  })
  const first = stroke.sample(sample)
  expect(first.stats.changed).toBe(1)
  const once = stroke.result().patch
  stroke.sample(sample)
  expect(stroke.result().patch).toEqual(once)
  const expected = smoothSceneSkinRow(
    asset.skins![0]!.weights.v_0_0!,
    sceneMeshVertexNeighbors(mesh)
      .get('v_0_0')!
      .map((id) => asset.skins![0]!.weights[id]!),
    1,
  )
  expect(expected.status).toBe('changed')
  if (expected.status === 'changed') expect(once.v_0_0).toEqual(expected.influences)
  const committed = stroke.commit()
  expect(readSceneDocument(committed).status).toBe('valid')
})
