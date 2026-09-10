import { expect, test } from 'bun:test'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { structuredBytes } from '../core/structuredBytes'
import { encodeSceneGlb } from '../export/sceneGlb'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeSceneTwoBoneFixture } from '../testing/sceneTwoBone'
import { prepareSceneGlbInWorker } from '../workers/sceneGlb'
import { readSceneBendLimit } from './bendLimit'
import { setSceneBendLimit } from './bendLimitCommands'
import { duplicateSceneNodes } from './commands'
import { sceneToJson } from './documentJson'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation } from './sampleAnimation'
import { prepareSceneTwoBonePose } from './twoBonePose'
import { solveTwoBoneReach, type TwoBoneReachInput } from './twoBoneReach'

const straight: TwoBoneReachInput = {
  root: [0, 0, 0],
  middle: [1, 0, 0],
  tip: [2, 0, 0],
  target: [1, 1, 0],
}

test('flexion bounds preserve both lengths at the chosen angle across unequal bones and wide scales', () => {
  for (const scale of [1e-150, 0.25, 1, 7, 1e150])
    for (const second of [0.5, 1, 3])
      for (const angle of [0, 15, 60, 90, 120, 175, 180]) {
        const input: TwoBoneReachInput = {
            ...straight,
            middle: [scale, 0, 0],
            tip: [(1 + second) * scale, 0, 0],
            target: [0.2 * scale, 0.3 * scale, 0.1 * scale],
            limit: { min: angle, max: angle },
          },
          before = structuredClone(input),
          result = solveTwoBoneReach(input),
          upper = new Vector3(...result.middle).divideScalar(scale),
          lower = new Vector3(...result.tip).sub(new Vector3(...result.middle)).divideScalar(scale)
        expect(upper.length()).toBeCloseTo(1, 12)
        expect(lower.length()).toBeCloseTo(second, 12)
        expect((upper.angleTo(lower) * 180) / Math.PI).toBeCloseTo(angle, 5)
        expect(result.status).toBe(angle === 180 && second !== 1 ? 'too-close' : 'bend-limit')
        expect(input).toEqual(before)
      }
})

test('a range preserves reachable targets and distinguishes geometric reach from configured flexion', () => {
  const limited = solveTwoBoneReach({ ...straight, limit: { min: 30, max: 120 } })
  expect(limited.tip).toEqual(straight.target)
  expect(limited.status).toBe('reached')
  expect(
    solveTwoBoneReach({ ...straight, target: [0, 0, 0], limit: { min: 0, max: 90 } }).status,
  ).toBe('bend-limit')
  expect(
    solveTwoBoneReach({ ...straight, target: [5, 0, 0], limit: { min: 0, max: 90 } }).status,
  ).toBe('too-far')
  expect(
    solveTwoBoneReach({
      ...straight,
      tip: [4, 0, 0],
      target: [0, 0, 0],
      limit: { min: 30, max: 180 },
    }).status,
  ).toBe('too-close')
  const noOp = { ...straight, target: straight.tip }
  expect(solveTwoBoneReach({ ...noOp, limit: { min: 0, max: 180 } })).toEqual(
    solveTwoBoneReach(noOp),
  )
  expect(solveTwoBoneReach({ ...noOp, limit: { min: 45, max: 90 } }).status).toBe('bend-limit')
  expect(() => solveTwoBoneReach({ ...straight, limit: { min: 1e-100, max: 180 } })).toThrow(
    'precisão',
  )
})

test('limited reach follows rigid and reflected coordinate changes without changing the bend side', () => {
  for (let i = 0; i < 64; i++) {
    const input: TwoBoneReachInput = {
        ...straight,
        target: [0.2 + i / 25, 0.3, -0.1],
        hint: [0, 0, 1],
        limit: { min: 20, max: 95 },
      },
      original = solveTwoBoneReach(input),
      size = (0.25 + i / 10) * (i % 2 ? -1 : 1),
      transform = new Matrix4().compose(
        new Vector3(3, -7, 11),
        new Quaternion().setFromEuler(new Euler(i * 0.13, i * -0.03, i * 0.07)),
        new Vector3(size, size, size),
      ),
      point = (value: Vec3): Vec3 => new Vector3(...value).applyMatrix4(transform).toArray(),
      result = solveTwoBoneReach({
        ...input,
        root: point(input.root),
        middle: point(input.middle),
        tip: point(input.tip),
        target: point(input.target),
        hint: point(input.hint!),
      })
    expect(result.status).toBe(original.status)
    for (const key of ['middle', 'tip'] as const) {
      const expected = point(original[key])
      for (let axis = 0; axis < 3; axis++)
        expect(result[key][axis]!).toBeCloseTo(expected[axis]!, 10)
    }
  }
})

test('native bend limits roundtrip exactly, own their values and duplicate with supports; metadata editing is one undo', () => {
  const source = makeSceneTwoBoneFixture(),
    limit = { min: 12.3456789012345, max: 123.456789012345 },
    next = setSceneBendLimit(source, 'middle', limit),
    editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
      autosaveMs: 60_000,
    })
  try {
    expect(next.animations).toBe(source.animations)
    expect(next.geometries).toBe(source.geometries)
    expect(next.images).toBe(source.images)
    expect(next.nodes.find((node) => node.id === 'root')).toBe(
      source.nodes.find((node) => node.id === 'root'),
    )
    expect(setSceneBendLimit(next, 'middle', limit)).toBe(next)
    const read = readSceneDocument(sceneToJson(next))
    expect(read.status).toBe('valid')
    if (read.status !== 'valid') throw new Error('Expected native roundtrip')
    expect(read.document).toEqual(next)
    limit.min = 99
    expect(
      readSceneBendLimit(
        (next.nodes.find((node) => node.id === 'middle') as { bendLimit: unknown }).bendLimit,
      ).min,
    ).toBe(12.3456789012345)
    let id = 0
    const duplicate = duplicateSceneNodes(next, ['middle'], () => `copy-${++id}`),
      copied = duplicate.nodes.find((node) => node.id !== 'middle' && node.name === 'middle')!
    expect(copied.kind !== 'mesh' && copied.bendLimit).toEqual({
      min: 12.3456789012345,
      max: 123.456789012345,
    })
    editor.getState().commit(next)
    editor.getState().undo()
    expect(editor.getState().asset.nodes).toEqual(source.nodes)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.nodes).toEqual(next.nodes)
    expect(setSceneBendLimit(next, 'middle', null).nodes).toEqual(source.nodes)
    expect(setSceneBendLimit(source, 'middle', null)).toBe(source)
  } finally {
    editor.getState().dispose()
  }
})

test('malformed ranges, mesh rules and locked dependent subtrees refuse without repairs', () => {
  const source = makeSceneTwoBoneFixture()
  for (const input of [
    null,
    {},
    { min: -1, max: 90 },
    { min: 0, max: 181 },
    { min: 100, max: 20 },
    { min: NaN, max: 90 },
    { min: 0, max: Infinity },
    { min: 0, max: 90, extra: true },
  ]) {
    expect(() => readSceneBendLimit(input)).toThrow()
    const raw = {
      ...source,
      nodes: source.nodes.map((node) =>
        node.id === 'middle' ? { ...node, bendLimit: input } : node,
      ),
    }
    expect(readSceneDocument(raw).status).toBe('invalid')
  }
  expect(() => setSceneBendLimit(source, 'body', { min: 0, max: 90 })).toThrow('apoio')
  expect(() => setSceneBendLimit(source, 'absent', null)).toThrow()
  expect(
    readSceneDocument({
      ...source,
      nodes: source.nodes.map((node) =>
        node.id === 'body' ? { ...node, bendLimit: { min: 0, max: 90 } } : node,
      ),
    }).status,
  ).toBe('invalid')
  for (const id of ['parent', 'middle', 'body']) {
    const locked = {
      ...source,
      nodes: source.nodes.map((node) => (node.id === id ? { ...node, locked: true } : node)),
    }
    expect(() => setSceneBendLimit(locked, 'middle', { min: 0, max: 90 })).toThrow('Destrave')
  }
})

test.each([
  'local',
  'local-delta',
] as const)('%s limited poses match saved playback; portable export reports the lost editable rule', async (space) => {
  const source = makeSceneTwoBoneFixture(space),
    document = setSceneBendLimit(source, 'middle', { min: 45, max: 90 }),
    prepared = prepareSceneTwoBonePose(document, 'clip', ['root', 'middle', 'tip'], 0.7),
    frame = prepared.sample([0, 0, 0]),
    committed = prepared.commit(frame, document)
  expect(prepared.original.pose.worldMatrices).toEqual(
    prepareSceneAnimation(source, 'clip').sample(0.7, false).worldMatrices,
  )
  expect(frame.reach.status).toBe('bend-limit')
  expect(prepareSceneAnimation(committed, 'clip').sample(0.7, false).worldMatrices).toEqual(
    frame.pose.worldMatrices,
  )
  expect(committed.nodes).toBe(document.nodes)
  expect(() => encodeSceneGlb(committed)).toThrow('Confira')
  const result = encodeSceneGlb(committed, { allowLosses: true }),
    worker = await prepareSceneGlbInWorker({
      document: committed,
      documentId: committed.id,
      revision: 0,
    })
  expect(worker).toEqual(result)
  expect(result.issues).toContainEqual({ code: 'bend-limit-omitted', sourceId: 'middle' })
  expect(document.animations).toBe(source.animations)
})
