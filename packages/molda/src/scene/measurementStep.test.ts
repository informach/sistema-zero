import { expect, test } from 'bun:test'
import { snapSceneMeasurement, snapSceneScale } from './measurementStep'

test('measurement precision supports whole units and tenths, including negative positions and minimum sizes', () => {
  expect(snapSceneMeasurement(3.7, 1)).toBe(4)
  expect(snapSceneMeasurement(-2.7, 1)).toBe(-3)
  expect(snapSceneMeasurement(1.15, 0.1)).toBe(1.2)
  expect(snapSceneMeasurement(3.25, 0.1)).toBe(3.3)
  expect(snapSceneMeasurement(21.15, 0.1)).toBe(21.2)
  expect(snapSceneMeasurement(-2.77, 0.1)).toBe(-2.8)
  expect(snapSceneMeasurement(0.04, 0.1, 0.1)).toBe(0.1)
  expect(snapSceneMeasurement(0.2, 1, 1)).toBe(1)
  expect(Object.is(snapSceneMeasurement(-0.01, 0.1), -0)).toBe(false)
  expect(snapSceneMeasurement(Number.MAX_VALUE, 0.1)).toBe(Number.MAX_VALUE)
  expect(snapSceneScale([1.64, 1, 1], [2, 3.25, 0], 0.1)).toEqual([1.65, 1, 1])
})
