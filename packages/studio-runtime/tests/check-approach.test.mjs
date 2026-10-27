import { expect, test } from 'bun:test'
import { approachSprite, planApproach } from '../runtime/check-approach.mjs'

const actor = {
  x: 20,
  y: 20,
  w: 20,
  h: 20,
  rawX: 20,
  rawY: 20,
  rawW: 20,
  rawH: 20,
  width: 320,
  height: 240,
  destroyed: false,
  paused: false,
  errors: 0,
  generation: 1,
}
const target = { ...actor, x: 260, y: 20, rawX: 260 }
test('navigation routes around a key instead of crossing it on a door-only trial', () => {
  const route = planApproach(actor, target, [{ x: 120, y: 0, w: 32, h: 80 }])
  expect(route.at(-1)).toEqual({ x: 270, y: 30 })
  expect(route.some((p) => p.y >= 96)).toBe(true)
  expect(() => planApproach(actor, target, [{ x: 120, y: 0, w: 32, h: 240 }])).toThrow()
  expect(() => planApproach({ ...actor, width: 10000 }, target)).toThrow()
})
test('an interrupted navigation releases its pressed key and every observation handle', async () => {
  const keys = [],
    released = []
  let count = 0
  const probe = {
    handle: async () => {
      const index = count++
      let reads = 0
      return {
        bounds: async () =>
          index === 0 ? (++reads === 1 ? actor : { ...actor, paused: true }) : target,
        dispose: async () => released.push(index),
      }
    },
  }
  const page = {
    keyboard: { down: async (k) => keys.push(['down', k]), up: async (k) => keys.push(['up', k]) },
    waitForTimeout: async () => {},
  }
  await expect(
    approachSprite(probe, page, {
      scope: 'scope',
      actorPath: 'actor',
      targetPath: 'target',
      timeoutMs: 100,
    }),
  ).rejects.toThrow('parou')
  expect(keys).toEqual([
    ['down', 'ArrowRight'],
    ['up', 'ArrowRight'],
  ])
  expect(released).toEqual([0, 1])
})
