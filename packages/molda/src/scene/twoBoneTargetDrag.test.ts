import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { makeSceneTwoBoneFixture } from '../testing/sceneTwoBone'
import { setSceneBendLimit } from './bendLimitCommands'
import { prepareSceneTwoBonePose } from './twoBonePose'

test('target translation uses private captured world inputs, retains the bend hint/limit and never reindexes geometry', () => {
  const source = setSceneBendLimit(makeSceneTwoBoneFixture(), 'middle', { min: 30, max: 100 }),
    prepared = prepareSceneTwoBonePose(source, 'clip', ['root', 'middle', 'tip'], 0.7),
    target: Vec3 = [3, 0, 0],
    hint: Vec3 = [0, 0, 2],
    seed = prepared.sample(target, hint),
    expected = prepared.sample([1.5, 0.25, 0], hint)
  target.fill(999)
  hint.fill(999)
  ;(seed.pose.twoBoneGuide!.target as Vec3).fill(999)
  const geometry = Object.getOwnPropertyDescriptor(source, 'geometries')!
  Object.defineProperty(source, 'geometries', {
    configurable: true,
    get() {
      throw new Error('Geometry must not be read during a drag')
    },
  })
  try {
    for (let i = 0; i < 120; i++) {
      const result = prepared.translate(seed, [-1.5, 0.25, 0])
      expect(result.pose.worldMatrices).toEqual(expected.pose.worldMatrices)
      expect(result.pose.twoBoneGuide?.target).toEqual([1.5, 0.25, 0])
      expect(result.reach).toEqual(expected.reach)
    }
    expect(() => prepared.translate(prepared.original, [0, 0, 0])).toThrow('prévia')
    expect(() => prepared.translate({ ...seed }, [0, 0, 0])).toThrow('prévia')
    expect(() => prepared.translate(seed, [NaN, 0, 0])).toThrow()
    expect(() => prepared.translate(seed, [1e-100, 0, 0])).toThrow('precisão')
    prepared.cancel()
    expect(() => prepared.translate(seed, [0, 0, 0])).toThrow('encerrado')
  } finally {
    Object.defineProperty(source, 'geometries', geometry)
  }
})
