import { expect, test } from 'bun:test'
import { BufferAttribute, LineSegments, Points } from 'three'
import type { Vec3 } from '../core/model'
import { setSceneBendLimit } from '../scene/bendLimitCommands'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { prepareSceneTwoBonePose } from '../scene/twoBonePose'
import { makeSceneTwoBoneFixture } from '../testing/sceneTwoBone'
import { SceneSupportOverlay } from './SceneSupportOverlay'
import { prepareSceneTwoBoneGuide } from './sceneTwoBoneGuide'

test('assistance owns the requested world target independently of its limited endpoint and saved animation', () => {
  const source = setSceneBendLimit(makeSceneTwoBoneFixture(), 'middle', { min: 45, max: 90 }),
    prepared = prepareSceneTwoBonePose(source, 'clip', ['root', 'middle', 'tip'], 0),
    target: Vec3 = [0, 0, 0],
    frame = prepared.sample(target),
    points = prepareSceneTwoBoneGuide(frame.pose, () => true)
  expect(prepared.original.pose.twoBoneGuide).toBeUndefined()
  expect(points.map((point) => [point.id, point.parent, point.selected, point.locked])).toEqual([
    ['root', null, false, true],
    ['middle', 0, false, true],
    ['tip', 1, false, true],
    ['$two-bone-target', 2, true, true],
  ])
  expect(points[3]!.position).toEqual(target)
  expect(points[2]!.position).not.toEqual(target)
  target[0] = 999
  points[3]!.position[1] = 999
  expect(frame.pose.twoBoneGuide?.target).toEqual([0, 0, 0])
  expect(prepareSceneTwoBoneGuide(frame.pose, (id) => id !== 'middle')).toEqual([])
  const committed = prepared.commit(frame, source)
  expect(prepareSceneAnimation(committed, 'clip').sample(0, false).twoBoneGuide).toBeUndefined()
  expect(committed.nodes).toBe(source.nodes)
  expect(JSON.stringify(committed)).not.toContain('twoBoneGuide')
  const extreme = prepared.sample([1e150, 0, 0])
  expect(prepareSceneTwoBoneGuide(extreme.pose, () => true)).toHaveLength(3)
  expect(extreme.pose.twoBoneGuide?.target).toEqual([1e150, 0, 0])
})

test('a four-point guide allocates only 192 attribute bytes, reuses them, suppresses unchanged uploads and releases once', () => {
  const overlay = new SceneSupportOverlay(4),
    source = makeSceneTwoBoneFixture(),
    prepared = prepareSceneTwoBonePose(source, 'clip', ['root', 'middle', 'tip'], 0),
    objects = overlay.root.children.map((object) => {
      if (!(object instanceof Points || object instanceof LineSegments))
        throw new Error('Missing guide')
      return object
    }),
    attributes = objects.map((object) => {
      const position = object.geometry.getAttribute('position')
      if (!(position instanceof BufferAttribute)) throw new Error('Missing owned attribute')
      return position
    })
  let disposed = 0
  for (const object of objects) {
    object.geometry.addEventListener('dispose', () => disposed++)
    if (Array.isArray(object.material)) throw new Error('Expected one material')
    object.material.addEventListener('dispose', () => disposed++)
  }
  try {
    expect(attributes.reduce((bytes, attribute) => bytes + attribute.array.byteLength, 0)).toBe(192)
    for (let i = 0; i < 120; i++) {
      const points = prepareSceneTwoBoneGuide(prepared.sample([1, 1, i / 100]).pose, () => true)
      expect(overlay.update(points)).toBe(true)
      const versions = attributes.map((attribute) => attribute.version)
      expect(overlay.update(points)).toBe(false)
      expect(attributes.map((attribute) => attribute.version)).toEqual(versions)
      for (const [index, object] of objects.entries())
        expect(object.geometry.getAttribute('position')).toBe(attributes[index]!)
    }
    expect(objects.map((object) => object.geometry.drawRange.count)).toEqual([6, 4, 1])
    const points = prepareSceneTwoBoneGuide(prepared.original.pose, () => true)
    expect(overlay.update(points)).toBe(true)
    expect(overlay.root.visible).toBe(false)
    expect(overlay.hide()).toBe(false)
  } finally {
    overlay.dispose()
    overlay.dispose()
  }
  expect(disposed).toBe(6)
  for (const capacity of [0, -1, 0.5, NaN, Infinity])
    expect(() => new SceneSupportOverlay(capacity)).toThrow('orçamento')
})
