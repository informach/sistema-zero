/**
 * APRESENTAÇÃO dos tiers de liga (rótulo PT + emoji), chaveada pelos mesmos ids do
 * members (`domain/gamification/league.ts`). Id desconhecido → fallback (forward-compat).
 */
interface TierInfo {
  labelPt: string
  emoji: string
}

const TIER_INFO: Record<string, TierInfo> = {
  bronze: { labelPt: 'Bronze', emoji: '🥉' },
  prata: { labelPt: 'Prata', emoji: '🥈' },
  ouro: { labelPt: 'Ouro', emoji: '🥇' },
  platina: { labelPt: 'Platina', emoji: '💠' },
  diamante: { labelPt: 'Diamante', emoji: '💎' },
}

export function tierInfo(tier: string): TierInfo {
  return TIER_INFO[tier] ?? { labelPt: tier, emoji: '🏅' }
}
