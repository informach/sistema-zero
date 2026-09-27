import { describe, expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { animatedScene, sceneAnimationClip, sceneRotationTrack } from '../testing/sceneAnimation'
import type { SceneAnimationTrack } from './animation'
import {
  configureSceneAnimation,
  createSceneAnimation,
  deleteSceneAnimation,
  duplicateSceneAnimation,
  removeSceneAnimationKeys,
  renameSceneAnimation,
  retimeSceneAnimation,
  reverseSceneAnimation,
  type SceneAnimationKeyInput,
  setSceneAnimationKey,
} from './animationCommands'
import { groupSceneNodes, setSceneNodeFlag } from './commands'
import type { MoldaSceneDocument } from './document'
import { sceneToJson } from './documentJson'
import { SCENE_LIMITS } from './limits'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation, sampleSceneAnimationTrack } from './sampleAnimation'

describe('animation authoring commands', () => {
  test('create, rename, duplicate and delete preserve unrelated resources and own copied keys', () => {
    const source = animatedScene()
    const original = structuredClone(source)
    const created = createSceneAnimation(source, '  Saltar  ', () => 'jump')
    expect(created.animations?.[1]).toEqual({
      id: 'jump',
      name: 'Saltar',
      duration: 2,
      fps: 24,
      loop: true,
      space: 'local-delta',
      tracks: [],
    })
    expect(created.nodes).toBe(source.nodes)
    expect(created.geometries).toBe(source.geometries)
    expect(created.images).toBe(source.images)
    expect(created.animations?.[0]).toBe(source.animations[0])
    const renamed = renameSceneAnimation(created, 'jump', ' Pular ')
    expect(renamed.animations?.[1]?.name).toBe('Pular')
    expect(renameSceneAnimation(renamed, 'jump', 'Pular')).toBe(renamed)
    const copied = duplicateSceneAnimation(source, 'clip', 'Outro aceno', () => 'copy')
    expect(copied.animations?.[1]?.tracks).toEqual(source.animations[0]?.tracks)
    expect(copied.animations?.[1]?.tracks[0]?.keys[0]?.value).not.toBe(
      source.animations[0]?.tracks[0]?.keys[0]?.value,
    )
    expect(deleteSceneAnimation(copied, 'copy').animations).toEqual(source.animations)
    expect(() => createSceneAnimation(source, 'nome', () => 'clip')).toThrow('identidade')
    expect(() => createSceneAnimation(source, ' ')).toThrow()
    expect(() => deleteSceneAnimation(source, 'missing')).toThrow('não existe')
    expect(readSceneDocument(sceneToJson(copied)).status).toBe('valid')
    expect(source).toEqual(original)
  })

  test('fps changes never retime/snap keys, and shortening refuses keys past the new end', () => {
    const source = animatedScene()
    const changed = configureSceneAnimation(source, 'clip', { duration: 4, fps: 12, loop: false })
    expect(changed.animations?.[0]?.tracks).toBe(source.animations[0]?.tracks)
    expect(configureSceneAnimation(changed, 'clip', { duration: 4, fps: 12, loop: false })).toBe(
      changed,
    )
    expect(() =>
      configureSceneAnimation(source, 'clip', { duration: 1, fps: 24, loop: true }),
    ).toThrow('depois desse final')
    expect(() =>
      configureSceneAnimation(source, 'clip', { duration: 2, fps: 23.976, loop: true }),
    ).toThrow()
    expect(source.animations[0]?.tracks[0]?.keys[1]?.time).toBe(1.123456789123)
  })

  test('explicit keys insert/replace at exact seconds and own input while retaining other keys/tracks', () => {
    const source = animatedScene()
    source.animations[0]!.tracks.push(sceneRotationTrack())
    const original = structuredClone(source)
    const input: SceneAnimationKeyInput = {
      nodeId: 'body',
      channel: 'translation',
      key: {
        time: 0.123456789123,
        value: [1, Number.MIN_VALUE, -2],
        interpolation: 'smooth',
      },
    }
    const changed = setSceneAnimationKey(source, 'clip', input)
    const track = changed.animations![0]!.tracks[0]!
    expect(track.keys.map((key) => key.time)).toEqual([0, 0.123456789123, 1.123456789123, 2])
    expect(track.keys[0]).toBe(source.animations[0]?.tracks[0]?.keys[0])
    expect(track.keys[1]?.value).not.toBe(input.key.value)
    expect(changed.animations?.[0]?.tracks[1]).toBe(source.animations[0]?.tracks[1])
    expect(changed.nodes).toBe(source.nodes)
    expect(setSceneAnimationKey(changed, 'clip', input)).toBe(changed)
    input.key.value[0] = 10
    expect(track.keys[1]?.value[0]).toBe(1)
    const replaced = setSceneAnimationKey(changed, 'clip', input)
    expect(replaced.animations?.[0]?.tracks[0]?.keys).toHaveLength(4)
    expect(replaced.animations?.[0]?.tracks[0]?.keys[1]?.value[0]).toBe(10)
    expect(readSceneDocument(replaced).status).toBe('valid')
    expect(source).toEqual(original)
  })

  test('new scale/rotation tracks, malformed keys and derived/missing targets are handled at the command boundary', () => {
    const source = animatedScene()
    const rotation: SceneAnimationKeyInput = {
      nodeId: 'body',
      channel: 'rotation',
      key: { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
    }
    const changed = setSceneAnimationKey(source, 'clip', rotation)
    const scaled = setSceneAnimationKey(changed, 'clip', {
      nodeId: 'wing',
      channel: 'scale',
      key: { time: 0, value: [-1, 0, 2.3456789123], interpolation: 'step' },
    })
    expect(scaled.animations?.[0]?.tracks).toHaveLength(3)
    expect(readSceneDocument(scaled).status).toBe('valid')
    for (const input of [
      { ...rotation, nodeId: 'missing' },
      { ...rotation, channel: 'opacity' },
      { ...rotation, key: { ...rotation.key, value: [0, 0, 0, 0] } },
      { ...rotation, key: { ...rotation.key, time: 2.01 } },
      { ...rotation, key: { ...rotation.key, value: [NaN, 0, 0, 1] } },
      { ...rotation, key: { ...rotation.key, customCurve: true } },
    ])
      expect(() => setSceneAnimationKey(source, 'clip', input as SceneAnimationKeyInput)).toThrow()
    expect(source.animations[0]?.tracks).toHaveLength(1)
  })

  test('removing keys is atomic across tracks, drops empty tracks, and keeps untouched references', () => {
    const source = animatedScene()
    source.animations[0]!.tracks.push(sceneRotationTrack())
    const refs = source.animations[0]!.tracks[0]!.keys.map((key) => ({
      nodeId: 'body',
      channel: 'translation' as const,
      time: key.time,
    }))
    const removed = removeSceneAnimationKeys(source, 'clip', refs)
    expect(removed.animations?.[0]?.tracks).toHaveLength(1)
    expect(removed.animations?.[0]?.tracks[0]).toBe(source.animations[0]?.tracks[1])
    expect(removeSceneAnimationKeys(source, 'clip', [])).toBe(source)
    expect(() =>
      removeSceneAnimationKeys(source, 'clip', [
        ...refs,
        { nodeId: 'body', channel: 'rotation', time: 0.123 },
      ]),
    ).toThrow('não existe')
    expect(
      removeSceneAnimationKeys(source, 'clip', [refs[0]!, refs[0]!]).animations?.[0]?.tracks[0]
        ?.keys,
    ).toHaveLength(2)
    expect(source.animations[0]?.tracks[0]?.keys).toHaveLength(3)
  })

  test('bulk deletion inspects times linearly, not once per selected key squared', () => {
    const source = animatedScene()
    let reads = 0
    const count = 1024
    const track: SceneAnimationTrack = {
      nodeId: 'body',
      channel: 'translation',
      keys: Array.from({ length: count }, (_, i) => ({
        get time() {
          reads++
          return i / count
        },
        value: [0, 0, 0],
        interpolation: 'linear',
      })),
    }
    source.animations[0]!.tracks = [track]
    const refs = Array.from({ length: count }, (_, i) => ({
      nodeId: 'body',
      channel: 'translation' as const,
      time: i / count,
    }))
    expect(removeSceneAnimationKeys(source, 'clip', refs).animations?.[0]?.tracks).toEqual([])
    expect(reads).toBeLessThanOrEqual(count * 5)
  })

  test('locks include inherited groups and locked descendants affected by a group track', () => {
    const grouped = groupSceneNodes(animatedScene(), ['body'], { nextId: () => 'group' })
    const source: MoldaSceneDocument = {
      ...setSceneNodeFlag(grouped, ['body'], 'locked', true),
      animations: [sceneAnimationClip('group')],
    }
    const key: SceneAnimationKeyInput = {
      nodeId: 'group',
      channel: 'rotation',
      key: { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
    }
    for (const operation of [
      () => setSceneAnimationKey(source, 'clip', key),
      () =>
        removeSceneAnimationKeys(source, 'clip', [
          { nodeId: 'group', channel: 'translation', time: 0 },
        ]),
      () => retimeSceneAnimation(source, 'clip', 3),
      () => reverseSceneAnimation(source, 'clip'),
      () => duplicateSceneAnimation(source, 'clip', 'Cópia'),
      () => deleteSceneAnimation(source, 'clip'),
      () => configureSceneAnimation(source, 'clip', { duration: 3, fps: 24, loop: true }),
    ])
      expect(operation).toThrow('Destrave')
    expect(renameSceneAnimation(source, 'clip', 'Nome').animations?.[0]?.name).toBe('Nome')
    const parentLocked = setSceneNodeFlag(grouped, ['group'], 'locked', true)
    expect(() => setSceneAnimationKey(parentLocked, 'clip', { ...key, nodeId: 'body' })).toThrow(
      'Destrave',
    )
  })

  test('retiming scales source times and preserves values/curves, including extreme finite durations', () => {
    const source = animatedScene()
    const original = structuredClone(source)
    const changed = retimeSceneAnimation(source, 'clip', 4)
    const before = prepareSceneAnimation(source, 'clip'),
      after = prepareSceneAnimation(changed, 'clip')
    for (const time of [0, 0.25, 0.5, 1, 1.25, 1.75, 2])
      expect(after.sample(time * 2, false).worldMatrices).toEqual(
        before.sample(time, false).worldMatrices,
      )
    expect(changed.animations?.[0]?.tracks[0]?.keys[1]?.value).toBe(
      source.animations[0]?.tracks[0]?.keys[1]?.value,
    )
    expect(retimeSceneAnimation(source, 'clip', 2)).toBe(source)
    const tiny = animatedScene()
    tiny.animations[0]!.tracks[0]!.keys[1]!.time = Number.MIN_VALUE
    expect(retimeSceneAnimation(tiny, 'clip', 4).animations?.[0]?.tracks[0]?.keys[1]?.time).toBe(
      Number.MIN_VALUE * 2,
    )
    const minimal = animatedScene()
    minimal.animations[0]!.duration = Number.MIN_VALUE
    minimal.animations[0]!.tracks[0]!.keys = [
      { time: 0, value: [0, 0, 0], interpolation: 'linear' },
      { time: Number.MIN_VALUE, value: [1, 0, 0], interpolation: 'linear' },
    ]
    expect(
      retimeSceneAnimation(minimal, 'clip', 600).animations?.[0]?.tracks[0]?.keys.map(
        (key) => key.time,
      ),
    ).toEqual([0, 600])
    expect(source).toEqual(original)
  })

  test('reversing continuous segments mirrors evaluation and step still means holding the left pose', () => {
    const source = animatedScene()
    source.animations[0]!.tracks.push(sceneRotationTrack())
    const reversed = reverseSceneAnimation(source, 'clip')
    for (const [i, track] of source.animations[0]!.tracks.entries())
      for (const t of [0, 0.25, 0.5, 1, 1.25, 1.75, 2]) {
        const actual = sampleSceneAnimationTrack(reversed.animations![0]!.tracks[i]!, t)
        const expected = sampleSceneAnimationTrack(track, 2 - t)
        actual.forEach((value, j) => {
          expect(value).toBeCloseTo(expected[j]!, 12)
        })
      }
    const step = animatedScene()
    step.animations[0]!.tracks[0]!.keys = [
      { time: 0, value: [1, 0, 0], interpolation: 'step' },
      { time: 2, value: [2, 0, 0], interpolation: 'linear' },
    ]
    const track = reverseSceneAnimation(step, 'clip').animations![0]!.tracks[0]!
    expect(sampleSceneAnimationTrack(track, 1)).toEqual([2, 0, 0])
    expect(sampleSceneAnimationTrack(track, 2)).toEqual([1, 0, 0])
  })

  test('precision collisions and aggregate budgets refuse the entire operation', () => {
    const source = animatedScene()
    source.animations[0]!.tracks[0]!.keys[1]!.time = Number.MIN_VALUE
    const original = structuredClone(source)
    expect(() => reverseSceneAnimation(source, 'clip')).toThrow('mesmo instante')
    expect(() => retimeSceneAnimation(source, 'clip', Number.MIN_VALUE)).toThrow('mesmo instante')
    const full: MoldaSceneDocument = {
      ...source,
      animations: Array.from({ length: SCENE_LIMITS.animationClips }, (_, i) => ({
        ...sceneAnimationClip(),
        id: `clip-${i}`,
        tracks: [],
      })),
    }
    expect(() => createSceneAnimation(full, 'Extra')).toThrow('clipes demais')
    const keys = Array.from({ length: SCENE_LIMITS.animationKeys }, (_, i) => ({
      time: i / SCENE_LIMITS.animationKeys,
      value: [0, 0, 0] as [number, number, number],
      interpolation: 'linear' as const,
    }))
    const large = animatedScene()
    large.animations[0]!.tracks[0]!.keys = keys
    expect(() => duplicateSceneAnimation(large, 'clip', 'Extra')).toThrow('orçamento')
    expect(() =>
      setSceneAnimationKey(large, 'clip', {
        nodeId: 'body',
        channel: 'translation',
        key: { time: 2, value: [1, 0, 0], interpolation: 'linear' },
      }),
    ).toThrow('orçamento')
    expect(source).toEqual(original)
  })

  test('a recorded key is one real undo/redo entry and restores unchanged original pose', () => {
    const source = animatedScene()
    const editor = createDocumentEditorStore<MoldaSceneDocument>({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
    try {
      const next = setSceneAnimationKey(source, 'clip', {
        nodeId: 'wing',
        channel: 'rotation',
        key: { time: 0.123, value: [0, 0, 0, 1], interpolation: 'smooth' },
      })
      editor.getState().commit(next)
      expect(editor.getState().asset.nodes).toBe(source.nodes)
      expect(editor.getState().asset.animations).toEqual(next.animations)
      editor.getState().undo()
      expect(editor.getState().asset.animations).toEqual(source.animations)
      expect(editor.getState().canUndo).toBe(false)
      editor.getState().redo()
      expect(editor.getState().asset.animations).toEqual(next.animations)
    } finally {
      editor.getState().dispose()
    }
  })
})
