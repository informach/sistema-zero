import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import { earnedStudioTier } from '@sistemazero/member-shell/server/studio-unlocks'
import type { StudioUnlocksResult } from '@/lib/studio-cta'

/**
 * Por que a porta está trancada: o NÍVEL ainda não abre o Estúdio livre (Faísca), ou o nível
 * abre mas nenhum curso concluído deu bloco ainda. As duas pedem recados diferentes: "Acenda
 * sua Faísca primeiro!" é falso para quem já é Construtor(a).
 */
export type StudioLockReason = 'level' | 'no-blocks'

export type StudioGate =
  | { kind: 'unavailable' }
  | { kind: 'journey-locked'; reason: StudioLockReason }
  | { kind: 'open'; tier: StudioTier }

/**
 * A porta do Estúdio livre depois da posse e do rank. Os blocos conquistados nos cursos são a
 * paleta inteira (sem reserva desde 02/10/2026). A ordem importa:
 * 1. nível sem Estúdio livre → trancado pelo nível (não depende da lista: uma Faísca não vê
 *    "tente de novo" por um soluço numa lista que nem a ajudaria);
 * 2. a EQUIPE ignora o currículo → abre mesmo se a lista não chegou;
 * 3. a lista não chegou → "tente de novo" (um soluço de rede não pode trancar quem já conquistou);
 * 4. nenhum bloco conquistado → o recado de concluir um curso;
 * 5. senão abre, com o tier que a página entrega ao editor.
 */
export function studioGate(
  levelSlug: string,
  role: string | undefined,
  unlocks: StudioUnlocksResult | null,
): StudioGate {
  const semLista = earnedStudioTier(levelSlug, role, [])
  if (!semLista.freeStudio) return { kind: 'journey-locked', reason: 'level' }
  if (!semLista.allowBlocks) return { kind: 'open', tier: semLista }
  if (unlocks?.status !== 200 || !unlocks.body) return { kind: 'unavailable' }
  const tier = earnedStudioTier(levelSlug, role, unlocks.body.blocks)
  if (!tier.hasPalette) return { kind: 'journey-locked', reason: 'no-blocks' }
  return { kind: 'open', tier }
}
