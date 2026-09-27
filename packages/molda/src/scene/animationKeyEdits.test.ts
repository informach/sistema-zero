import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { animatedScene, sceneRotationTrack } from '../testing/sceneAnimation'
import type { SceneAnimationTrack } from './animation'
import { shiftSceneAnimationKeys } from './animationCommands'
import { nearestSceneAnimationKey, sceneAnimationKeySelection } from './animationKeySelection'
import type { MoldaSceneDocument } from './document'
import { SCENE_LIMITS } from './limits'

test('moving multiple keys into vacated times is atomic, exact, and keeps untouched keys/resources', () => {
  const source = animatedScene()
  source.animations[0]!.tracks.push(sceneRotationTrack())
  const track = source.animations[0]!.tracks[0]!
  track.keys[1]!.time = 0.5
  const before = structuredClone(source)
  const refs = sceneAnimationKeySelection(source.animations[0]!, ['body']).inRange(
    0,
    0.5,
    'translation',
  )
  const next = shiftSceneAnimationKeys(source, 'clip', refs, 0.5, 'move')
  const keys = next.animations![0]!.tracks[0]!.keys
  expect(keys.map((key) => key.time)).toEqual([0.5, 1, 2])
  expect(keys[0]!.value).toBe(track.keys[0]!.value)
  expect(keys[1]!.interpolation).toBe('smooth')
  expect(keys[2]).toBe(track.keys[2])
  expect(next.animations![0]!.tracks[1]).toBe(source.animations[0]!.tracks[1])
  expect(next.nodes).toBe(source.nodes)
  expect(next.geometries).toBe(source.geometries)
  expect(source).toEqual(before)
  expect(shiftSceneAnimationKeys(source, 'clip', refs, 0, 'move')).toBe(source)
})

test('copy owns exact values, collapses duplicate refs and creates one reversible editor commit', () => {
  const source = animatedScene()
  const refs = sceneAnimationKeySelection(source.animations[0]!, ['body']).inRange(1, 1.5, 'all')
  const next = shiftSceneAnimationKeys(source, 'clip', [...refs, ...refs], 0.123456789123, 'copy')
  const keys = next.animations![0]!.tracks[0]!.keys
  expect(keys).toHaveLength(4)
  expect(keys[1]).toBe(source.animations[0]!.tracks[0]!.keys[1])
  expect(keys[2]!.time).toBe(1.123456789123 + 0.123456789123)
  expect(keys[2]!.value).toEqual(keys[1]!.value)
  expect(keys[2]!.value).not.toBe(keys[1]!.value)
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60000,
  })
  try {
    editor.getState().commit(next)
    editor.getState().undo()
    expect(editor.getState().asset.animations).toEqual(source.animations)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.animations).toEqual(next.animations)
  } finally {
    editor.getState().dispose()
  }
})

test('overlaps, out-of-range times, stale selections, invalid options and imperceptible Double shifts are refused without mutation', () => {
  const source = animatedScene(),
    before = structuredClone(source)
  const ref = { nodeId: 'body', channel: 'translation' as const, time: 0 }
  for (const operation of ['move', 'copy'] as const) {
    for (const offset of [-1, 2, 3, Infinity, NaN])
      expect(() => shiftSceneAnimationKeys(source, 'clip', [ref], offset, operation)).toThrow()
  }
  expect(() => shiftSceneAnimationKeys(source, 'clip', [ref], 0, 'copy')).toThrow('mesmo instante')
  expect(() =>
    shiftSceneAnimationKeys(source, 'clip', [{ ...ref, time: 0.8 }], 0.1, 'move'),
  ).toThrow('não existe')
  expect(() =>
    shiftSceneAnimationKeys(source, 'clip', [{ ...ref, time: 2 }], Number.MIN_VALUE, 'move'),
  ).toThrow('pequeno demais')
  expect(() => shiftSceneAnimationKeys(source, 'clip', [ref], 0.1, 'invalid' as 'move')).toThrow()
  expect(source).toEqual(before)
})

test('inherited locks apply to batch edits and copy budgets are checked before reading values', () => {
  const source = animatedScene()
  const ref = { nodeId: 'body', channel: 'translation' as const, time: 0 }
  const locked = {
    ...source,
    nodes: source.nodes.map((node) => (node.id === 'body' ? { ...node, locked: true } : node)),
  }
  expect(() => shiftSceneAnimationKeys(locked, 'clip', [ref], 0.1, 'copy')).toThrow()
  let reads = 0
  const track: SceneAnimationTrack = {
    nodeId: 'body',
    channel: 'translation',
    keys: Array.from({ length: SCENE_LIMITS.animationKeys }, (_, i) => ({
      time: i / SCENE_LIMITS.animationKeys,
      interpolation: 'linear',
      get value(): [number, number, number] {
        reads++
        return [0, 0, 0]
      },
    })),
  }
  const full = { ...source, animations: [{ ...source.animations[0]!, tracks: [track] }] }
  expect(() => shiftSceneAnimationKeys(full, 'clip', [ref], 1, 'copy')).toThrow('orçamento')
  expect(reads).toBe(0)
})

test('timeline selection merges exact channel times while range edits retain per-node identities', () => {
  const source = animatedScene(),
    clip = source.animations[0]!
  clip.tracks.push(sceneRotationTrack(), sceneRotationTrack('wing'))
  const selection = sceneAnimationKeySelection(clip, ['body', 'body', 'wing'])
  expect(selection.times).toEqual([0, 1.123456789123, 2])
  expect(selection.channels[1]!.times).toEqual([0, 2])
  expect(selection.inRange(0, 0, 'rotation')).toEqual([
    { nodeId: 'body', channel: 'rotation', time: 0 },
    { nodeId: 'wing', channel: 'rotation', time: 0 },
  ])
  expect(selection.inRange(NaN, 1, 'all')).toEqual([])
  expect(selection.inRange(2, 0, 'all')).toEqual([])
  expect(sceneAnimationKeySelection(clip, []).times).toEqual([])
  expect(nearestSceneAnimationKey([0, 1, 2], 0.5)).toBe(0)
  expect(nearestSceneAnimationKey([0, 1, 2], 1.7)).toBe(2)
  expect(nearestSceneAnimationKey([0, 1, 2], -5)).toBe(0)
  expect(nearestSceneAnimationKey([0, 1, 2], 99)).toBe(2)
  expect(nearestSceneAnimationKey([], 0)).toBeUndefined()
  expect(nearestSceneAnimationKey([0], NaN)).toBeUndefined()
})
