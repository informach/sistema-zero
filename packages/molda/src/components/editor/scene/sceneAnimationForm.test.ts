import { expect, test } from 'bun:test'
import type { Vec3 } from '../../../core/model'
import type { SceneAnimationClip } from '../../../scene/animation'
import { quaternionFromEulerXYZ } from '../../../scene/matrix'
import { animatedScene } from '../../../testing/sceneAnimation'
import {
  sceneAnimationFormKey,
  sceneAnimationFormNumber,
  sceneAnimationFormValue,
} from './sceneAnimationForm'

function form(initial: ReturnType<typeof sceneAnimationFormValue>) {
  const data = new FormData()
  initial.display.forEach((value, i) => {
    data.set(`axis${i}`, value)
  })
  data.set('interpolation', 'smooth')
  return data
}

test('unchanged rotation preserves the exact owned quaternion even when its displayed Euler angles are rounded', () => {
  const document = animatedScene(),
    node = document.nodes[0]!
  const q = quaternionFromEulerXYZ([13.123456789, 89.999999999, -78.987654321])
  q[3] *= 1 + 1e-8
  const clip: SceneAnimationClip = {
    ...document.animations[0]!,
    tracks: [
      {
        nodeId: node.id,
        channel: 'rotation',
        keys: [{ time: 0, value: q, interpolation: 'linear' }],
      },
    ],
  }
  const initial = sceneAnimationFormValue(node, clip, 'rotation', 0)
  const key = sceneAnimationFormKey(node.id, 'rotation', 0, initial, form(initial))
  expect(key.key.value).toEqual(q)
  expect(key.key.value).not.toBe(q)
  expect(key.key.interpolation).toBe('smooth')
  const data = form(initial)
  data.set('axis0', '45.123456789')
  const edited = sceneAnimationFormKey(node.id, 'rotation', 0, initial, data)
  expect(edited.key.value).toEqual(
    quaternionFromEulerXYZ([45.123456789, initial.angles![1], initial.angles![2]]),
  )
  expect(clip.tracks[0]!.keys[0]!.value).toEqual(q)
})

test('numeric fields keep Double precision and exact subnormal values, and reject missing or nonfinite input', () => {
  const document = animatedScene(),
    node = document.nodes.find((node) => node.id === 'body')!
  const clip = document.animations[0]!
  const initial = sceneAnimationFormValue(node, clip, 'translation', 1.123456789123)
  const data = form(initial)
  expect(
    sceneAnimationFormKey(node.id, 'translation', 1.123456789123, initial, data).key.value,
  ).toEqual([1.123456789, Number.MIN_VALUE, -2.234567891])
  for (const invalid of ['', ' ', 'NaN', 'Infinity', '-Infinity']) {
    data.set('axis0', invalid)
    expect(() => sceneAnimationFormKey(node.id, 'translation', 0, initial, data)).toThrow()
  }
  data.delete('axis0')
  expect(() => sceneAnimationFormNumber(data, 'axis0')).toThrow()
  data.set('axis0', '1')
  data.set('interpolation', 'spline')
  expect(() => sceneAnimationFormKey(node.id, 'translation', 0, initial, data)).toThrow()
})

test('missing delta channels use identity; imported absolute channels use the original local TRS', () => {
  const document = animatedScene(),
    node = {
      ...document.nodes[0]!,
      transform: {
        kind: 'trs' as const,
        translation: [4, 5, 6] as Vec3,
        rotation: quaternionFromEulerXYZ([20, 30, 40]),
        scale: [2, -3, 0] as Vec3,
      },
    }
  const clip = { ...document.animations[0]!, tracks: [] }
  expect(sceneAnimationFormValue(node, clip, 'translation', 0).value).toEqual([0, 0, 0])
  expect(sceneAnimationFormValue(node, clip, 'rotation', 0).value).toEqual([0, 0, 0, 1])
  expect(sceneAnimationFormValue(node, clip, 'scale', 0).value).toEqual([1, 1, 1])
  for (const channel of ['translation', 'rotation', 'scale'] as const) {
    const initial = sceneAnimationFormValue(node, { ...clip, space: 'local' }, channel, 0)
    expect(sceneAnimationFormKey(node.id, channel, 0, initial, form(initial)).key.value).toEqual(
      node.transform[channel],
    )
  }
})
