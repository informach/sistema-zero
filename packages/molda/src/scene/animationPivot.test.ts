import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import {
  markSceneAnimationChannel,
  recordSceneAnimationChannelValue,
  recordSceneAnimationInputs,
} from './animationArrival'
import { createSceneAnimation } from './animationCommands'
import { captureSceneAnimationLocalPose } from './animationPose'
import { prepareSceneAnimationPoseTransform } from './animationPoseTransform'
import { addScenePrimitive } from './commands'
import type { MoldaSceneDocument } from './document'
import { sceneToJson } from './documentJson'
import { affineMultiply, composeTransform, quaternionFromEulerXYZ, transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import { setSceneAuthoringPivot } from './pivot'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation } from './sampleAnimation'

export function pivotTurn() {
  let document = addScenePrimitive(
    migrateLegacyModel(makeModel({ parts: [] })).document,
    'box',
    'Peça',
  )
  const id = document.nodes[0]!.id
  document = setSceneAuthoringPivot(document, id, [1, -1, 0])
  document = createSceneAnimation(document, 'Girar')
  const clip = document.animations![0]!.id
  const prepared = prepareSceneAnimationPoseTransform(document, clip, [id], 1)
  const center = transformPoint(prepared.original.pose.worldMatrices.get(id)!, [1, -1, 0])
  const translation = (sign: number) =>
    composeTransform({
      kind: 'trs',
      translation: center.map((n) => n * sign) as [number, number, number],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    })
  const delta = affineMultiply(
    translation(1),
    affineMultiply(
      composeTransform({
        kind: 'trs',
        translation: [0, 0, 0],
        rotation: quaternionFromEulerXYZ([0, 110, 25]),
        scale: [1, 1, 1],
      }),
      translation(-1),
    ),
  )
  const frame = prepared.apply(prepared.original, delta)
  document = recordSceneAnimationInputs(document, clip, prepared.keys(frame))
  return { document, id, clip, center }
}

test('a newly authored turn keeps its pivot fixed between keys, and changing the authoring pivot leaves that entire curve intact', () => {
  const { document, id, clip, center } = pivotTurn()
  const sampler = prepareSceneAnimation(document, clip)
  const changed = prepareSceneAnimation(setSceneAuthoringPivot(document, id, [-3, 2, 4]), clip)
  for (let time = 0; time <= 1; time += 1 / 128) {
    const pose = sampler.sample(time, false)
    const point = transformPoint(pose.worldMatrices.get(id)!, [1, -1, 0])
    point.forEach((value, axis) => {
      expect(value).toBeCloseTo(center[axis]!, 11)
    })
    expect(changed.sample(time, false).worldMatrices).toEqual(pose.worldMatrices)
    const captured = captureSceneAnimationLocalPose(document, clip, id, time)
    const matrix = composeTransform({
      kind: 'trs',
      translation: captured.translation,
      rotation: captured.rotation,
      scale: captured.scale,
    })
    matrix.forEach((value, axis) => {
      expect(value).toBeCloseTo(pose.worldMatrices.get(id)![axis]!, 11)
    })
  }
  const read = readSceneDocument(sceneToJson(document))
  expect(read.status).toBe('valid')
  if (read.status === 'valid') expect(read.document.animations).toEqual(document.animations)
})

test('editing an interpolated pivot pose starts at the displayed matrix without jumping', () => {
  const { document, id, clip } = pivotTurn()
  const prepared = prepareSceneAnimationPoseTransform(document, clip, [id], 0.37)
  const moved = prepared.apply(
    prepared.original,
    composeTransform({
      kind: 'trs',
      translation: [2, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    }),
  )
  const before = prepared.original.pose.worldMatrices.get(id)!,
    after = moved.pose.worldMatrices.get(id)!
  after.forEach((value, axis) => {
    expect(value).toBeCloseTo(before[axis]! + (axis === 12 ? 2 : 0), 10)
  })
  const committed = recordSceneAnimationInputs(document, clip, prepared.keys(moved))
  const sampled = prepareSceneAnimation(committed, clip).sample(0.37, false).worldMatrices.get(id)!
  sampled.forEach((value, axis) => {
    expect(value).toBeCloseTo(after[axis]!, 10)
  })
})

test('explicitly marking any unchanged channel at a fractional pivot pose preserves its displayed matrix', () => {
  const { document, id, clip } = pivotTurn()
  for (const channel of ['translation', 'rotation', 'scale'] as const) {
    for (const time of [0, 0.13, 0.37, 0.9, 1]) {
      const before = prepareSceneAnimation(document, clip)
        .sample(time, false)
        .worldMatrices.get(id)!
      const next = markSceneAnimationChannel(document, clip, { nodeId: id, channel, time })
      const after = prepareSceneAnimation(next, clip).sample(time, false).worldMatrices.get(id)!
      after.forEach((value, axis) => {
        expect(value).toBeCloseTo(before[axis]!, 10)
      })
      expect(
        next
          .animations![0]!.tracks.find((track) => track.nodeId === id && track.channel === channel)
          ?.keys.some((key) => key.time === time),
      ).toBe(true)
    }
  }
})

test('numeric rotation and size keep the displayed pivot fixed, including between existing poses', () => {
  const { document, id, clip } = pivotTurn()
  for (const time of [0, 0.37, 0.71, 1]) {
    const before = prepareSceneAnimation(document, clip).sample(time, false).worldMatrices.get(id)!
    const center = transformPoint(before, [1, -1, 0])
    for (const input of [
      {
        nodeId: id,
        channel: 'rotation' as const,
        key: { time, value: quaternionFromEulerXYZ([0, 75, 10]), interpolation: 'smooth' as const },
      },
      {
        nodeId: id,
        channel: 'scale' as const,
        key: {
          time,
          value: [1.5, 2, 0.5] as [number, number, number],
          interpolation: 'smooth' as const,
        },
      },
    ]) {
      const next = recordSceneAnimationChannelValue(document, clip, input)
      const after = prepareSceneAnimation(next, clip).sample(time, false).worldMatrices.get(id)!
      transformPoint(after, [1, -1, 0]).forEach((value, axis) => {
        expect(value).toBeCloseTo(center[axis]!, 10)
      })
      const value = captureSceneAnimationLocalPose(next, clip, id, time)
      expect(value[input.channel]).toEqual(input.key.value)
    }
    const pose = captureSceneAnimationLocalPose(document, clip, id, time)
    const unchanged = recordSceneAnimationChannelValue(document, clip, {
      nodeId: id,
      channel: 'rotation',
      key: { time, value: pose.rotation, interpolation: 'smooth' },
    })
    prepareSceneAnimation(unchanged, clip)
      .sample(time, false)
      .worldMatrices.get(id)!
      .forEach((value, axis) => {
        expect(value).toBeCloseTo(before[axis]!, 10)
      })
  }
})

test('numeric position uses the displayed origin and cancels the rotation interval correction in its stored key', () => {
  const { document, id, clip } = pivotTurn()
  const next = recordSceneAnimationChannelValue(document, clip, {
    nodeId: id,
    channel: 'translation',
    key: { time: 0.37, value: [4, 5, 6], interpolation: 'smooth' },
  })
  const value = captureSceneAnimationLocalPose(next, clip, id, 0.37)
  value.translation.forEach((value, axis) => {
    expect(value).toBeCloseTo([4, 5, 6][axis]!, 10)
  })
})

test('numeric local authoring remains well-defined beneath a rotated singular parent', () => {
  const { document, id, clip } = pivotTurn()
  const nested: MoldaSceneDocument = {
    ...document,
    nodes: [
      {
        id: 'singular-parent',
        name: 'Grupo achatado',
        kind: 'group',
        parentId: null,
        hidden: false,
        locked: false,
        transform: {
          kind: 'trs',
          translation: [4, -2, 8],
          rotation: quaternionFromEulerXYZ([17, 32, -21]),
          scale: [0, 2, 3],
        },
      },
      ...document.nodes.map((node) => ({ ...node, parentId: 'singular-parent' })),
    ],
  }
  expect(readSceneDocument(sceneToJson(nested)).status).toBe('valid')
  const original = structuredClone(nested)
  const time = 0.37
  const before = prepareSceneAnimation(nested, clip).sample(time, false).worldMatrices.get(id)!
  const next = recordSceneAnimationChannelValue(nested, clip, {
    nodeId: id,
    channel: 'rotation',
    key: { time, value: quaternionFromEulerXYZ([25, 76, -12]), interpolation: 'smooth' },
  })
  const after = prepareSceneAnimation(next, clip).sample(time, false).worldMatrices.get(id)!
  const pivot = transformPoint(before, [1, -1, 0])
  transformPoint(after, [1, -1, 0]).forEach((value, axis) => {
    expect(value).toBeCloseTo(pivot[axis]!, 10)
  })
  expect(nested).toEqual(original)
})
