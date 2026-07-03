/**
 * Delta de gamificação devolvido pelo advance (`{ cycle, gamification? }`).
 * O members manda um shape maior (totalXp/streak/coins...) mas o Pensa só
 * apresenta XP + "nova conquista" genérica (badges são papel do HOST). Parser
 * seguro: campo ausente/null/malformado → null (fail-open, nunca quebra a UI).
 */
import { z } from 'zod'

const gamificationDeltaSchema = z.object({
  /** XP desta ação (0 = já premiado antes; o ledger do members é idempotente). */
  xpAwarded: z.number(),
  /** Slug largo de propósito (forward-compat) — aqui só contamos o length. */
  badgesUnlocked: z.array(z.object({ slug: z.string(), unlockedAt: z.string() })).default([]),
})

export type PensaGamificationDelta = z.infer<typeof gamificationDeltaSchema>

/** Extrai o delta (unknown) com segurança (ausente/null/malformado → null). */
export function parseGamificationDelta(value: unknown): PensaGamificationDelta | null {
  const result = gamificationDeltaSchema.safeParse(value)
  return result.success ? result.data : null
}
