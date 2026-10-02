import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { earnedStudioTier } from '@sistemazero/member-shell/server/studio-unlocks'

export type StudioGate =
  | { kind: 'unavailable' }
  | { kind: 'journey-locked' }
  | { kind: 'open'; tier: StudioTier }

interface UnlocksResponse {
  status: number
  body?: { blocks: readonly string[] } | null
}

/**
 * A porta do Estúdio livre depois da posse e do rank. Os blocos conquistados nos cursos são a
 * paleta inteira (sem reserva desde 02/10/2026), então:
 * - a lista não chegou → "tente de novo" (um soluço de rede não pode trancar quem já conquistou);
 * - nível sem Estúdio livre, ou nenhum bloco conquistado → o recado de concluir um curso;
 * - senão abre, com o tier que a página entrega ao editor.
 */
export function studioGate(
  levelSlug: string,
  role: string | undefined,
  unlocks: UnlocksResponse | null,
): StudioGate {
  if (unlocks?.status !== 200 || !unlocks.body) return { kind: 'unavailable' }
  const tier = earnedStudioTier(levelSlug, role, unlocks.body.blocks)
  if (!tier.freeStudio || !tier.hasPalette) return { kind: 'journey-locked' }
  return { kind: 'open', tier }
}
