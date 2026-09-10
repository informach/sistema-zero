import { expect, test } from 'bun:test'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { animatedScene } from '../testing/sceneAnimation'
import { createSceneAnimationPreset } from './animationPresets'
import { SCENE_LIMITS } from './limits'
import { composeTransform } from './matrix'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation, prepareSceneAnimationPreview } from './sampleAnimation'

test.each([
  'bounce',
  'sway',
  'spin',
] as const)('%s preset adds an editable clip and preview uses the exact original revision without changing it', (kind) => {
  const source = animatedScene(),
    before = structuredClone(source)
  const next = createSceneAnimationPreset(
    source,
    ['body'],
    {
      kind,
      name: 'Movimento',
      axis: 'y',
      duration: 2.123456789123,
      amount: kind === 'sway' ? 25.123456789 : 1,
    },
    () => 'preset',
  )
  const clip = next.animations!.at(-1)!
  expect(next.nodes).toBe(source.nodes)
  expect(next.geometries).toBe(source.geometries)
  expect(next.images).toBe(source.images)
  expect(next.animations![0]).toBe(source.animations[0])
  expect(clip).toMatchObject({
    id: 'preset',
    duration: 2.123456789123,
    space: 'local-delta',
    loop: true,
  })
  expect(clip.tracks).toHaveLength(1)
  expect(clip.tracks[0]!.keys.at(-1)!.time).toBe(2.123456789123)
  expect(readSceneDocument(next).status).toBe('valid')
  const preview = prepareSceneAnimationPreview(source, clip),
    saved = prepareSceneAnimation(next, clip.id)
  expect(preview.clip).not.toBe(clip)
  expect(preview.clip.tracks[0]!.keys[0]!.value).not.toBe(clip.tracks[0]!.keys[0]!.value)
  for (let i = 0; i <= 20; i++) {
    const time = (clip.duration * i) / 20
    expect([...preview.sample(time, false).worldMatrices]).toEqual([
      ...saved.sample(time, false).worldMatrices,
    ])
    expect(preview.sample(time, false).source).toBe(source)
  }
  expect(source).toEqual(before)
})

test.each([
  'x',
  'y',
  'z',
] as const)('spin around local %s completes negative turns with intermediate keys and matches independent matrices', (axis) => {
  const source = animatedScene(),
    node = source.nodes.find((node) => node.id === 'body')!
  const next = createSceneAnimationPreset(
    source,
    [node.id],
    { kind: 'spin', name: 'Girar', axis, duration: 2, amount: -2 },
    () => 'spin',
  )
  const sampler = prepareSceneAnimation(next, 'spin')
  expect(sampler.clip.tracks[0]!.keys).toHaveLength(9)
  const direction = new Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
  for (let i = 0; i <= 40; i++) {
    const time = i / 20
    const expected = new Matrix4()
      .fromArray(composeTransform(node.transform))
      .multiply(
        new Matrix4().makeRotationFromQuaternion(
          new Quaternion().setFromAxisAngle(direction, -2 * Math.PI * time),
        ),
      ).elements
    const actual = sampler.sample(time, false).worldMatrices.get(node.id)!
    for (let j = 0; j < 16; j++) expect(actual[j]).toBeCloseTo(expected[j]!, 12)
  }
})

test('presets reject locks, invalid settings, precision collisions and exhausted budgets before allocating IDs', () => {
  const source = animatedScene(),
    before = structuredClone(source)
  const options = {
    kind: 'bounce' as const,
    name: 'Pular',
    axis: 'y' as const,
    duration: 2,
    amount: 1,
  }
  expect(() => createSceneAnimationPreset(source, [], options)).toThrow('Escolha')
  expect(() =>
    createSceneAnimationPreset(
      { ...source, nodes: source.nodes.map((node) => ({ ...node, locked: true })) },
      ['body'],
      options,
    ),
  ).toThrow('Destrave')
  expect(() =>
    createSceneAnimationPreset(source, ['body'], { ...options, kind: 'spin', amount: 1.5 }),
  ).toThrow()
  expect(() =>
    createSceneAnimationPreset(source, ['body'], { ...options, kind: 'sway', amount: 91 }),
  ).toThrow()
  expect(() =>
    createSceneAnimationPreset(source, ['body'], { ...options, duration: Number.MIN_VALUE }),
  ).toThrow('tempos repetidos')
  const full = {
    ...source,
    animations: Array.from({ length: SCENE_LIMITS.animationClips }, (_, i) => ({
      ...source.animations[0]!,
      id: `clip-${i}`,
    })),
  }
  let ids = 0
  expect(() =>
    createSceneAnimationPreset(full, ['body'], options, () => {
      ids++
      return 'preset'
    }),
  ).toThrow('orçamento')
  expect(ids).toBe(0)
  expect(source).toEqual(before)
})
