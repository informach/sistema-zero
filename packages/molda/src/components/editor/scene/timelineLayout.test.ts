import { expect, test } from 'bun:test'
import {
  timelineHeight,
  timelineReleasedHeight,
  timelineSnappedTime,
  timelineStoredHeight,
  timelineTimeAt,
} from './timelineLayout'

test('timeline respects exact collapse boundaries and keeps a viewport in short windows', () => {
  expect([119, 120, 161, 162].map((height) => timelineReleasedHeight(height, 840))).toEqual([
    60, 162, 162, 162,
  ])
  expect(timelineHeight(306, 840)).toBe(306)
  expect(timelineHeight(900, 840)).toBe(600)
  expect(timelineHeight(306, 500)).toBe(260)
  expect(timelineHeight(306, 840)).toBe(306)
  expect(timelineHeight(306, 300)).toBe(60)
  expect(timelineHeight(306, 100)).toBe(60)
})

test('timeline storage rejects invalid values and the time scale follows exact endpoints', () => {
  for (const raw of [null, '', '0', 'NaN', 'Infinity', '-1', '119', '900000'])
    expect(timelineStoredHeight(raw)).toBe(306)
  expect(timelineStoredHeight('60')).toBe(60)
  expect(timelineStoredHeight('342')).toBe(342)
  expect(timelineTimeAt(14, 812, 2)).toBe(0)
  expect(timelineTimeAt(798, 812, 2)).toBe(2)
  expect(timelineTimeAt(406, 812, 2)).toBe(1)
  expect(timelineSnappedTime(0.071, 2)).toBe(0.05)
})
