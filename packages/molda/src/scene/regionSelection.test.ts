import { describe, expect, test } from 'bun:test'
import type { Vec2 } from './document'
import { pointInSelection } from './regionSelection'

describe('screen selection regions', () => {
  test('box includes its boundary and works in every drag direction', () => {
    for (const from of [
      [0.2, 0.3],
      [0.8, 0.7],
    ] as Vec2[]) {
      const to: Vec2 = from[0] === 0.2 ? [0.8, 0.7] : [0.2, 0.3]
      expect(pointInSelection([0.5, 0.5], { kind: 'box', from, to })).toBe(true)
      expect(pointInSelection([0.2, 0.7], { kind: 'box', from, to })).toBe(true)
      expect(pointInSelection([0.1, 0.5], { kind: 'box', from, to })).toBe(false)
    }
    expect(pointInSelection([NaN, 0], { kind: 'box', from: [0, 0], to: [1, 1] })).toBe(false)
  })
  test('lasso handles concavity, reversed winding and exact edge hits', () => {
    const points: Vec2[] = [
      [0, 0],
      [1, 0],
      [1, 0.25],
      [0.25, 0.25],
      [0.25, 1],
      [0, 1],
    ]
    for (const loop of [points, [...points].reverse()]) {
      expect(pointInSelection([0.5, 0.1], { kind: 'lasso', points: loop })).toBe(true)
      expect(pointInSelection([0.1, 0.5], { kind: 'lasso', points: loop })).toBe(true)
      expect(pointInSelection([0.5, 0.5], { kind: 'lasso', points: loop })).toBe(false)
      expect(pointInSelection([0.25, 0.8], { kind: 'lasso', points: loop })).toBe(true)
    }
    expect(pointInSelection([0, 0], { kind: 'lasso', points: [] })).toBe(false)
  })
})
