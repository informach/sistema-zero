import { describe, expect, test } from 'bun:test'
import { Matrix4, Quaternion as ThreeQuaternion, Vector3 } from 'three'
import { animatedScene, sceneAnimationClip, sceneRotationTrack } from '../testing/sceneAnimation'
import type { SceneAnimationTrack } from './animation'
import { groupSceneNodes, reparentSceneNodes, ungroupSceneNodes } from './commands'
import type { MoldaSceneDocument } from './document'
import { indexSceneNodes } from './graph'
import { composeTransform, type Quaternion } from './matrix'
import {
  prepareSceneAnimation,
  sampleSceneAnimationTrack,
  sceneAnimationTime,
} from './sampleAnimation'

describe('derived animation sampling', () => {
  test('clock clamps/seeks exact ends and loops without erasing tiny positive Double times', () => {
    const clip = sceneAnimationClip()
    expect(sceneAnimationTime(clip, 2)).toBe(0)
    expect(sceneAnimationTime(clip, 4.25)).toBe(0.25)
    expect(sceneAnimationTime(clip, -0.25)).toBe(1.75)
    expect(sceneAnimationTime(clip, Number.MIN_VALUE)).toBe(Number.MIN_VALUE)
    expect(Object.is(sceneAnimationTime(clip, -0), -0)).toBe(false)
    expect(sceneAnimationTime({ ...clip, loop: false }, 3)).toBe(2)
    expect(sceneAnimationTime({ ...clip, loop: false }, -1)).toBe(0)
    for (const time of [NaN, Infinity, -Infinity])
      expect(() => sceneAnimationTime(clip, time)).toThrow()
  })

  test('linear/step/smooth values have exact boundaries, owned endpoints and no overshoot', () => {
    const track: SceneAnimationTrack = {
      nodeId: 'body',
      channel: 'translation',
      keys: [
        { time: 0.1, value: [-8, 0, Number.MIN_VALUE], interpolation: 'linear' },
        { time: 0.9, value: [8, 4, Number.MIN_VALUE], interpolation: 'step' },
        { time: 1.5, value: [0, 0, 0], interpolation: 'linear' },
      ],
    }
    const original = structuredClone(track)
    expect(sampleSceneAnimationTrack(track, 0)).toEqual(track.keys[0]!.value)
    expect(sampleSceneAnimationTrack(track, 0)).not.toBe(track.keys[0]!.value)
    expect(sampleSceneAnimationTrack(track, 0.3)[0]).toBeCloseTo(-4, 14)
    expect(sampleSceneAnimationTrack(track, 0.5)[2]).toBe(Number.MIN_VALUE)
    expect(sampleSceneAnimationTrack(track, 0.9)).toEqual([8, 4, Number.MIN_VALUE])
    expect(sampleSceneAnimationTrack(track, 1.4)).toEqual([8, 4, Number.MIN_VALUE])
    expect(sampleSceneAnimationTrack(track, 1.5)).toEqual([0, 0, 0])
    expect(sampleSceneAnimationTrack(track, 200)).toEqual([0, 0, 0])
    const smooth: SceneAnimationTrack = {
      ...track,
      keys: track.keys.map((key) => ({ ...key, interpolation: 'smooth' })),
    }
    expect(sampleSceneAnimationTrack(smooth, 0.3)[0]).toBeCloseTo(-5.5, 14)
    for (let i = 0; i <= 100; i++) {
      const value = sampleSceneAnimationTrack(smooth, 0.1 + i * 0.008)[0]!
      expect(value).toBeGreaterThanOrEqual(-8)
      expect(value).toBeLessThanOrEqual(8)
    }
    expect(track).toEqual(original)
  })

  test('rotations follow shortest-arc SLERP, including opposite signs, tiny angles and ease-in/out', () => {
    const a = new ThreeQuaternion().setFromAxisAngle(new Vector3(1, 2, 3).normalize(), 0.71)
    for (const angle of [0, 1e-10, 1e-4, 0.01, 1, Math.PI, 4, Math.PI * 2]) {
      const b = a
        .clone()
        .multiply(new ThreeQuaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle))
      for (const sign of [1, -1]) {
        const track: SceneAnimationTrack = {
          nodeId: 'body',
          channel: 'rotation',
          keys: [
            { time: 0, value: a.toArray() as Quaternion, interpolation: 'linear' },
            {
              time: 2,
              value: b.toArray().map((v) => v * sign) as Quaternion,
              interpolation: 'step',
            },
          ],
        }
        for (const weight of [0, 0.0001, 0.2, 0.5, 0.9, 1]) {
          const expected = a
            .clone()
            .slerp(new ThreeQuaternion().fromArray(track.keys[1]!.value), weight)
            .normalize()
          const result = new ThreeQuaternion().fromArray(
            sampleSceneAnimationTrack(track, weight * 2),
          )
          // q and -q describe the same orientation, including a sign-changed exact endpoint.
          expect(Math.abs(result.dot(expected))).toBeCloseTo(1, 13)
          expect(result.length()).toBeCloseTo(1, 14)
        }
      }
    }
    const smooth = sceneRotationTrack()
    smooth.keys[0]!.interpolation = 'smooth'
    const q = sampleSceneAnimationTrack(smooth, 0.5)
    expect(q[2]).toBeCloseTo(Math.sin((Math.PI * 0.15625) / 2), 14)
  })

  test('extreme finite translations/scales interpolate without subtraction overflow or fps snapping', () => {
    const track: SceneAnimationTrack = {
      nodeId: 'body',
      channel: 'scale',
      keys: [
        { time: Number.MIN_VALUE, value: [-Number.MAX_VALUE, 1, -1], interpolation: 'linear' },
        { time: 1, value: [Number.MAX_VALUE, -1, 1], interpolation: 'linear' },
      ],
    }
    expect(sampleSceneAnimationTrack(track, 0.5)).toEqual([0, 0, 0])
    expect(sampleSceneAnimationTrack(track, 0.25)[0]! / Number.MAX_VALUE).toBeCloseTo(-0.5, 14)
    expect(sampleSceneAnimationTrack(track, Number.MIN_VALUE)).toEqual(track.keys[0]!.value)
    const source = animatedScene()
    const sample = prepareSceneAnimation(source, 'clip')
    expect(sample.sample(1.123456789123).time).toBe(1.123456789123)
    expect(sample.sample(2, false).time).toBe(2)
    expect(sample.sample(2).time).toBe(0)
    expect(() => prepareSceneAnimation(source, 'absent')).toThrow('não existe')
  })

  test('parent and child delta TRS preserve affine rest/shear and agree with independent matrix composition', () => {
    const grouped = groupSceneNodes(animatedScene(), ['body'], { nextId: () => 'group' })
    const group = grouped.nodes.find((node) => node.id === 'group')!
    group.transform = {
      kind: 'affine',
      matrix: [1, 0, 0, 0, 0.4, 2, 0, 0, 0, 0.3, -1, 0, 1, 2, 3, 1],
    }
    const child = grouped.nodes.find((node) => node.id === 'body')!
    const source: MoldaSceneDocument = {
      ...grouped,
      animations: [
        {
          ...sceneAnimationClip('group'),
          tracks: [
            sceneRotationTrack('group'),
            {
              nodeId: 'body',
              channel: 'translation',
              keys: [{ time: 0, value: [1, 2, 3], interpolation: 'linear' }],
            },
          ],
        },
      ],
    }
    const original = structuredClone(source)
    const compiled = prepareSceneAnimation(source, 'clip')
    const first = compiled.sample(1)
    const expected = new Matrix4()
      .fromArray(composeTransform(group.transform))
      .multiply(new Matrix4().makeRotationZ(Math.PI / 2))
      .multiply(new Matrix4().fromArray(composeTransform(child.transform)))
      .multiply(new Matrix4().makeTranslation(1, 2, 3))
    first.worldMatrices.get('body')!.forEach((value, i) => {
      expect(value).toBeCloseTo(expected.elements[i]!, 12)
    })
    const originalPose = structuredClone(first.worldMatrices)
    compiled.sample(1.5)
    expect(first.worldMatrices).toEqual(originalPose)
    expect(first.source).toBe(source)
    expect(source).toEqual(original)
  })

  test('absolute local clips retain unkeyed rest channels and static reparenting preserves delta motion for all sampled times', () => {
    const source = animatedScene()
    const node = source.nodes[0]!
    if (node.transform.kind !== 'trs') throw new Error('Missing TRS')
    node.transform.rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2]
    node.transform.scale = [-2, 0.25, 3]
    const absolute: MoldaSceneDocument = {
      ...source,
      animations: [
        {
          ...sceneAnimationClip(),
          space: 'local',
          tracks: [
            {
              nodeId: 'body',
              channel: 'translation',
              keys: [{ time: 0, value: [4, 5, 6], interpolation: 'linear' }],
            },
          ],
        },
      ],
    }
    const expected = composeTransform({ ...node.transform, translation: [4, 5, 6] })
    expect(prepareSceneAnimation(absolute, 'clip').sample(1).worldMatrices.get('body')).toEqual(
      expected,
    )
    const grouped = groupSceneNodes(source, ['body', 'wing'], { nextId: () => 'static' })
    const moved = reparentSceneNodes(grouped, ['body'], null)
    const separated = ungroupSceneNodes(grouped, ['static'])
    const samplers = [source, grouped, moved, separated].map((document) =>
      prepareSceneAnimation(document, 'clip'),
    )
    for (const time of [0, 0.1, 0.25, 0.5, 1, 1.25, 1.75, 2]) {
      const reference = samplers[0]!.sample(time, false).worldMatrices
      for (const sampler of samplers.slice(1))
        for (const id of ['body', 'wing'])
          sampler
            .sample(time, false)
            .worldMatrices.get(id)!
            .forEach((value, i) => {
              expect(value).toBeCloseTo(reference.get(id)![i]!, 12)
            })
    }
  })

  test('empty clips reproduce rest pose and animation compilation/sampling never reads geometry or image data', () => {
    const source = animatedScene()
    source.animations[0]!.tracks = []
    let reads = 0
    const observed = new Proxy(source, {
      get(target, key, receiver) {
        if (key === 'geometries' || key === 'images') reads++
        return Reflect.get(target, key, receiver)
      },
    })
    const compiled = prepareSceneAnimation(observed, 'clip')
    const rest = indexSceneNodes(source.nodes).worldMatrices
    expect(compiled.sample(0).worldMatrices).toEqual(rest)
    expect(compiled.sample(1).worldMatrices).toEqual(rest)
    expect(reads).toBe(0)
  })
})
