import { expect, test } from 'bun:test'
import { Matrix4 } from 'three'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { indexSceneDocument } from './documentIndex'
import { identityMatrix } from './matrix'
import { readSceneDocument } from './readDocument'
import { SCENE_SKIN_LIMITS } from './skin'
import {
  addSceneSkinJoint,
  createSceneSkin,
  removeSceneSkinJoint,
  setSceneSkinWeights,
} from './skinCommands'
import { sceneSkinJointUsage } from './skinJoints'
import { deformSceneSkin, prepareSceneSkin } from './skinPose'

function fixture() {
  const {
    document,
    input: { id, ...input },
  } = makeSceneSkinFixture()
  return createSceneSkin(document, input, () => id)
}

test('adding a joint captures only its affine rest, keeps old binds and Double weights, and changes no deformed vertex', () => {
  const original = fixture(),
    document = {
      ...original,
      nodes: original.nodes.map((node) =>
        node.id === 'lower'
          ? { ...node, transform: { kind: 'affine' as const, matrix: identityMatrix() } }
          : node,
      ),
    },
    before = structuredClone(document),
    sourceSkin = document.skins![0]!,
    next = addSceneSkinJoint(document, 'skin', 'rig'),
    skin = next.skins![0]!,
    index = indexSceneDocument(document),
    expected = new Matrix4()
      .fromArray(index.scene.worldMatrices.get('rig')!)
      .invert()
      .multiply(new Matrix4().fromArray(index.scene.worldMatrices.get('part-0')!))
  for (let i = 0; i < 16; i++)
    expect(skin.joints[2]!.inverseBindMatrix[i]!).toBeCloseTo(expected.elements[i]!, 12)
  expect(skin.joints.slice(0, 2).every((joint, i) => joint === sourceSkin.joints[i])).toBe(true)
  expect(skin.weights).toBe(sourceSkin.weights)
  expect(next.nodes).toBe(document.nodes)
  expect(next.geometries).toBe(document.geometries)
  expect(next.images).toBe(document.images)
  expect(next.animations).toBe(document.animations)
  expect(deformSceneSkin(prepareSceneSkin(next, skin), index.scene.worldMatrices)).toEqual(
    deformSceneSkin(prepareSceneSkin(document, sourceSkin), index.scene.worldMatrices),
  )
  expect(document).toEqual(before)
  expect(readSceneDocument(next).status).toBe('valid')
  expect(removeSceneSkinJoint(next, 'skin', 'rig')).toEqual(document)
})

test('removal rejects every positive force; explicit zero-slot removal preserves other row identities and bind relations', () => {
  const document = addSceneSkinJoint(fixture(), 'skin', 'rig'),
    source = setSceneSkinWeights(document, 'skin', {
      v_1_0: [...document.skins![0]!.weights.v_1_0!, { jointId: 'rig', weight: 0 }],
    }),
    skin = source.skins![0]!,
    before = structuredClone(source)
  expect(sceneSkinJointUsage(skin)).toEqual(
    new Map([
      ['upper', { positive: 3, zero: 1 }],
      ['lower', { positive: 3, zero: 1 }],
      ['rig', { positive: 0, zero: 1 }],
    ]),
  )
  expect(() => removeSceneSkinJoint(source, 'skin', 'upper')).toThrow('ainda move pontos')
  const next = removeSceneSkinJoint(source, 'skin', 'rig'),
    after = next.skins![0]!
  expect(after.weights.v_1_0).toEqual(document.skins![0]!.weights.v_1_0!)
  expect(after.weights.v_1_0![0]).toBe(skin.weights.v_1_0![0]!)
  expect(after.weights.v_0_0).toBe(skin.weights.v_0_0)
  expect(after.joints.every((joint, i) => joint === skin.joints[i])).toBe(true)
  expect(next.nodes).toBe(source.nodes)
  expect(source).toEqual(before)
  const positive = setSceneSkinWeights(document, 'skin', {
    v_0_0: [
      { jointId: 'upper', weight: 1 },
      { jointId: 'rig', weight: 1e-100 },
    ],
  })
  expect(() => removeSceneSkinJoint(positive, 'skin', 'rig')).toThrow('ainda move pontos')
})

test('new singular joints are refused but an existing zero-scale joint does not force a rebind when adding another', () => {
  const document = fixture(),
    singular = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === 'lower'
          ? {
              ...node,
              transform: {
                kind: 'trs' as const,
                translation: [0, 1, 0] as [number, number, number],
                rotation: [0, 0, 0, 1] as [number, number, number, number],
                scale: [0, 1, 1] as [number, number, number],
              },
            }
          : node,
      ),
    },
    next = addSceneSkinJoint(singular, 'skin', 'rig')
  expect(next.skins![0]!.joints[1]).toBe(document.skins![0]!.joints[1]!)
  const candidate = {
    ...singular,
    nodes: [...singular.nodes, { ...singular.nodes[3]!, id: 'flat' }],
  }
  expect(() => addSceneSkinJoint(candidate, 'skin', 'flat')).toThrow('segurança')
  for (const id of ['missing', 'part-0', 'upper'])
    expect(() => addSceneSkinJoint(document, 'skin', id)).toThrow()
  expect(() => removeSceneSkinJoint(document, 'skin', 'missing')).toThrow('não pertence')
  const locked = {
    ...document,
    nodes: document.nodes.map((node) => (node.id === 'rig' ? { ...node, locked: true } : node)),
  }
  expect(() => addSceneSkinJoint(locked, 'skin', 'rig')).toThrow('Destrave')
  expect(() => removeSceneSkinJoint(locked, 'skin', 'upper')).toThrow('Destrave')
})

test('joint budgets reject growth atomically, and prototype-like node IDs stay ordinary own data', () => {
  let document = fixture()
  document = {
    ...document,
    nodes: [
      ...document.nodes,
      ...Array.from({ length: SCENE_SKIN_LIMITS.joints - 1 }, (_, i) => ({
        ...document.nodes[2]!,
        id: i ? `extra-${i}` : '__proto__',
      })),
    ],
  }
  for (const node of document.nodes.slice(4, -1))
    document = addSceneSkinJoint(document, 'skin', node.id)
  expect(document.skins![0]!.joints).toHaveLength(SCENE_SKIN_LIMITS.joints)
  const before = structuredClone(document)
  expect(() => addSceneSkinJoint(document, 'skin', document.nodes.at(-1)!.id)).toThrow('limite')
  expect(sceneSkinJointUsage(document.skins![0]!).get('__proto__')).toEqual({
    positive: 0,
    zero: 0,
  })
  expect(removeSceneSkinJoint(document, 'skin', '__proto__').skins![0]!.joints).toHaveLength(
    SCENE_SKIN_LIMITS.joints - 1,
  )
  expect(document).toEqual(before)
})
