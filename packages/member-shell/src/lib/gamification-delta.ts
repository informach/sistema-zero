import type { GamificationDelta, GamificationMeView } from './types'

/** Apply authoritative totals, never increment locally (retries award zero). */
export function applyGamificationDelta(
  current: GamificationMeView | null,
  delta: GamificationDelta,
): GamificationMeView | null {
  if (!current) return null
  const unlocked = new Map(delta.badgesUnlocked.map((badge) => [badge.slug, badge.unlockedAt]))
  const known = new Set(current.badges.map((badge) => badge.slug))
  return {
    ...current,
    xp: delta.totalXp,
    coins:
      typeof delta.coinBalance === 'number'
        ? { ...current.coins, balance: delta.coinBalance }
        : current.coins,
    streak: {
      ...current.streak,
      current: delta.streak.current,
      best: delta.streak.best,
      activeToday: current.streak.activeToday || delta.streak.extended,
    },
    badges: [
      ...current.badges.map((badge) => ({
        ...badge,
        unlockedAt: unlocked.get(badge.slug) ?? badge.unlockedAt,
      })),
      ...delta.badgesUnlocked.filter((badge) => !known.has(badge.slug)),
    ],
  }
}
