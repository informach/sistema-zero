import { expect, test } from 'bun:test'
import { applyGamificationDelta } from '../src/lib/gamification-delta'
import type { GamificationDelta, GamificationMeView } from '../src/lib/types'

const initial: GamificationMeView = {
  level: null,
  xp: 100,
  coins: { balance: 30 },
  streak: { current: 2, best: 5, activeToday: false },
  badges: [{ slug: 'first-lesson', unlockedAt: null }],
}
const delta: GamificationDelta = {
  xpAwarded: 10,
  totalXp: 110,
  coinsAwarded: 5,
  coinBalance: 35,
  unitCompleted: false,
  streak: { current: 3, best: 5, extended: true },
  badgesUnlocked: [{ slug: 'first-lesson', unlockedAt: '2026-10-18T12:00:00Z' }],
}
test('replayed rewards do not duplicate totals or badges', () => {
  const once = applyGamificationDelta(initial, delta)
  expect(applyGamificationDelta(once, delta)).toEqual(once)
  expect(once?.xp).toBe(110)
  expect(once?.coins?.balance).toBe(35)
  expect(once?.badges).toEqual(delta.badgesUnlocked)
  expect(initial.xp).toBe(100)
})
test('missing state and legacy balances never invent a new balance', () => {
  expect(applyGamificationDelta(null, delta)).toBeNull()
  expect(applyGamificationDelta(initial, { ...delta, coinBalance: undefined })?.coins).toEqual(
    initial.coins,
  )
})
