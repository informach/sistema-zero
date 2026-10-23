import { expect, test } from 'bun:test'
import { animatedScene } from '../testing/sceneAnimation'
import { composeTransform, quaternionFromEulerXYZ } from './matrix'
import { rigidEmptyAnimations } from './rigidEmptyAnimations'
import { prepareSceneAnimation } from './sampleAnimation'

test('opening an authored relative rotation keeps the rest pose and removes the scale shear', () => {
  const source = animatedScene()
  const body = source.nodes.find((node) => node.id === 'body')!
  body.transform = {
    kind: 'affine',
    matrix: composeTransform({
      kind: 'trs',
      translation: [2, 3, 4],
      rotation: quaternionFromEulerXYZ([0, 0, 20]),
      scale: [1, 3, 1],
    }),
  }
  source.animations![0]!.tracks = [
    {
      nodeId: 'body',
      channel: 'rotation',
      keys: [
        { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
        { time: 1, value: quaternionFromEulerXYZ([0, 0, 45]), interpolation: 'linear' },
      ],
    },
  ]
  const saved = structuredClone(source)
  const opened = rigidEmptyAnimations(source)
  expect(opened.animations![0]!.space).toBe('local')
  expect(opened.nodes.find((node) => node.id === 'body')!.transform.kind).toBe('trs')
  const rest = prepareSceneAnimation(opened, 'clip').sample(0, false).worldMatrices.get('body')!
  const original = prepareSceneAnimation(source, 'clip').sample(0, false).worldMatrices.get('body')!
  rest.forEach((value, axis) => {
    expect(value).toBeCloseTo(original[axis]!, 12)
  })
  const matrix = prepareSceneAnimation(opened, 'clip').sample(1, false).worldMatrices.get('body')!
  expect(matrix[0]! * matrix[4]! + matrix[1]! * matrix[5]! + matrix[2]! * matrix[6]!).toBeCloseTo(
    0,
    10,
  )
  expect(source).toEqual(saved)
})

test('genuinely sheared targets retain their relative animation channels', () => {
  const source = animatedScene()
  source.nodes.find((node) => node.id === 'body')!.transform = {
    kind: 'affine',
    matrix: [1, 0, 0, 0, 0.3, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  }
  expect(rigidEmptyAnimations(source)).toBe(source)
})

test('an empty old movement becomes rigid when another piece has genuine shear', () => {
  const source = animatedScene()
  source.animations![0]!.tracks = []
  source.nodes.find((node) => node.id === 'wing')!.transform = {
    kind: 'affine',
    matrix: [1, 0, 0, 0, 0.3, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  }
  expect(rigidEmptyAnimations(source).animations![0]!.space).toBe('local')
})
