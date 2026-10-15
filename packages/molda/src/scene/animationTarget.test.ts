import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { animatedScene } from '../testing/sceneAnimation'
import { createSceneAnimation } from './animationCommands'
import { createSceneAnimationPreset } from './animationPresets'
import { prepareSceneAnimationTarget } from './animationTarget'
import { indexSceneDocument } from './documentIndex'
import { migrateLegacyModel } from './migrateLegacy'
import { addScenePrimitiveNear } from './placement'

test('whole-model candidate is atomic, preserves world positions and accepts future pieces in the same group', () => {
  const source = migrateLegacyModel(makeModel()).document
  const before = indexSceneDocument(source).scene.worldMatrices
  const target = prepareSceneAnimationTarget(source, [], 'model')
  const after = indexSceneDocument(target.document).scene.worldMatrices
  for (const node of source.nodes) expect(after.get(node.id)).toEqual(before.get(node.id))
  expect(source.nodes.some((node) => node.name === 'Modelo inteiro')).toBe(false)
  const next = createSceneAnimationPreset(target.document, target.ids, {
    kind: 'spin',
    name: 'Girar',
    axis: 'y',
    duration: 2,
    amount: 1,
  })
  expect(next.animations!.at(-1)!.tracks).toHaveLength(1)
  const extended = addScenePrimitiveNear(next, 'sphere', 'Cabeça', [])
  expect(extended.nodes.at(-1)!.parentId).toBe(target.ids[0]!)
  expect(extended.animations).toBe(next.animations)
  const manual = createSceneAnimation(target.document, 'Minha animação').animations!.at(-1)!
  expect(manual.duration).toBe(2)
  expect(manual.loop).toBe(false)
})

test('incompatible animated reparenting fails before any group is created', () => {
  const original = animatedScene()
  const source = {
    ...original,
    animations: original.animations.map((clip) => ({ ...clip, space: 'local' as const })),
  }
  const before = structuredClone(source)
  expect(() => prepareSceneAnimationTarget(source, [], 'model')).toThrow()
  expect(source).toEqual(before)
})
