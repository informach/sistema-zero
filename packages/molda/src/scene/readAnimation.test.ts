import { describe, expect, test } from 'bun:test'
import { readMoldaDocument } from '../core/documentReader'
import { animatedScene, sceneAnimationClip, sceneRotationTrack } from '../testing/sceneAnimation'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { SCENE_LIMITS } from './limits'
import { composeTransform } from './matrix'
import { readSceneAnimations } from './readAnimation'
import { readSceneDocument } from './readDocument'

describe('native animation source contracts', () => {
  test('optional clips own every key/tuple, retain Double precision and leave public v1 closed', () => {
    const source = animatedScene()
    source.animations[0]?.tracks.push(sceneRotationTrack(), {
      nodeId: 'body',
      channel: 'scale',
      keys: [{ time: Number.MIN_VALUE, value: [-1.25, 0, 1.234567891234], interpolation: 'step' }],
    })
    const original = structuredClone(source)
    const json = sceneToJson(source)
    const read = readSceneDocument(JSON.parse(JSON.stringify(json)))
    expect(read).toEqual({ status: 'valid', document: original })
    const key = json.animations?.[0]?.tracks[0]?.keys[1]
    if (!key) throw new Error('Missing key')
    key.value[0] = 999
    expect(source).toEqual(original)
    expect(readMoldaDocument(json)).toEqual({ status: 'unsupported', version: 2, raw: json })
    const { animations: _, ...old } = source
    expect(readSceneDocument(old)).toEqual({ status: 'valid', document: old })
    expect(Object.hasOwn(sceneToJson(old), 'animations')).toBe(false)
    expect(readSceneDocument({ ...old, animations: [] }).status).toBe('valid')
    const index = indexSceneDocument(source)
    expect(index.animatedNodes).toEqual(new Set(['body']))
    expect(index.animationTrackCount).toBe(3)
    expect(index.animationKeyCount).toBe(6)
  })

  test('signed zero is canonical without normalizing authored rotations or snapping times', () => {
    const clip = sceneAnimationClip('__proto__')
    clip.duration = Number.MIN_VALUE
    clip.tracks = [
      {
        nodeId: '__proto__',
        channel: 'rotation',
        keys: [
          { time: -0, value: [-0, 0, 0, 1 + 1e-8], interpolation: 'smooth' },
          { time: Number.MIN_VALUE, value: [0, 0, 0, -1], interpolation: 'step' },
        ],
      },
    ]
    const parsed = readSceneAnimations([clip])[0]
    expect(parsed?.tracks[0]?.keys[0]?.value).toEqual([0, 0, 0, 1 + 1e-8])
    expect(Object.is(parsed?.tracks[0]?.keys[0]?.time, -0)).toBe(false)
    expect(parsed?.tracks[0]?.keys[1]?.time).toBe(Number.MIN_VALUE)
    expect(Object.is(clip.tracks[0]?.keys[0]?.time, -0)).toBe(true)
  })

  test('malformed clips retain raw data, including unsupported interpolation and duplicate times', () => {
    const source = animatedScene()
    const clip = sceneAnimationClip()
    const track = clip.tracks[0]
    const key = track?.keys[0]
    if (!track || !key) throw new Error('Missing fixture')
    const invalid = [
      null,
      [null],
      [clip, clip],
      [{ ...clip, id: '../clip' }],
      [{ ...clip, loop: 1 }],
      [{ ...clip, space: 'world' }],
      [{ ...clip, hidden: true }],
      ...[0, -1, NaN, Infinity, 601].map((duration) => [{ ...clip, duration }]),
      ...[0, 121, 23.976].map((fps) => [{ ...clip, fps }]),
      [{ ...clip, tracks: [track, track] }],
      [{ ...clip, tracks: [{ ...track, keys: [] }] }],
      ...[
        { ...key, time: -1 },
        { ...key, time: 2.01 },
        { ...key, value: [NaN, 0, 0] },
        { ...key, value: [0, 0] },
        { ...key, interpolation: 'cubic' },
        { ...key, tangent: 0 },
      ].map((bad) => [{ ...clip, tracks: [{ ...track, keys: [bad] }] }]),
      ...[
        [key, key],
        [{ ...key, time: 1 }, key],
      ].map((keys) => [{ ...clip, tracks: [{ ...track, keys }] }]),
      [
        {
          ...clip,
          tracks: [{ ...track, channel: 'rotation', keys: [{ ...key, value: [0, 0, 0, 0.5] }] }],
        },
      ],
    ]
    for (const animations of invalid) {
      const raw = { ...source, animations }
      const read = readSceneDocument(raw)
      expect(read.status).toBe('invalid')
      if (read.status !== 'invalid') throw new Error('Expected invalid')
      expect(read.raw).toBe(raw)
      expect(read.path.startsWith('animations')).toBe(true)
    }
  })

  test('references target real nodes and absolute clips cannot silently decompose affine rests', () => {
    const source = animatedScene()
    const clip = source.animations[0]
    const node = source.nodes[0]
    if (!clip || !node) throw new Error('Missing fixture')
    source.mirrors.push({ id: 'mirror', name: 'Espelho', sourceId: 'body', axis: 'x', offset: 0 })
    for (const nodeId of ['missing', 'mirror'])
      expect(
        readSceneDocument({ ...source, animations: [sceneAnimationClip(nodeId)] }).status,
      ).toBe('invalid')
    clip.space = 'local'
    expect(readSceneDocument(source).status).toBe('valid')
    const matrix = composeTransform(node.transform)
    matrix[4] = 0.25
    node.transform = { kind: 'affine', matrix }
    expect(readSceneDocument(source).status).toBe('invalid')
    clip.space = 'local-delta'
    expect(readSceneDocument(source).status).toBe('valid')
  })

  test('clip, aggregate track and aggregate key budgets reject excess before copying its values', () => {
    const clip = sceneAnimationClip()
    expect(() => readSceneAnimations(new Array(SCENE_LIMITS.animationClips + 1))).toThrow(
      'orçamento',
    )
    const track = clip.tracks[0]
    const key = track?.keys[0]
    if (!track || !key) throw new Error('Missing fixture')
    const tracks = Array.from({ length: 2049 }, (_, i) => ({
      ...track,
      nodeId: `node-${i}`,
      keys: [key],
    }))
    expect(() =>
      readSceneAnimations([
        { ...clip, tracks },
        { ...clip, id: 'second', tracks },
      ]),
    ).toThrow('orçamento')
    const keys = Array.from({ length: SCENE_LIMITS.animationKeys }, (_, i) => ({
      ...key,
      time: i / SCENE_LIMITS.animationKeys,
    }))
    let inspectedExcess = false
    const excess = [key]
    Object.defineProperty(excess, '0', {
      get: () => {
        inspectedExcess = true
        return key
      },
    })
    expect(() =>
      readSceneAnimations([
        {
          ...clip,
          tracks: [
            { ...track, keys },
            { ...track, nodeId: 'wing', keys: excess },
          ],
        },
      ]),
    ).toThrow('orçamento')
    expect(inspectedExcess).toBe(false)
    expect(
      readSceneAnimations([{ ...clip, tracks: [{ ...track, keys }] }])[0]?.tracks[0]?.keys,
    ).toHaveLength(SCENE_LIMITS.animationKeys)
  })
})
