import type { GamificationMeView } from '@/lib/types'

/**
 * Subtítulo do menu/rodapé do avatar (sidebar do desktop, dropdown e top bar do
 * mobile). DECISÃO 06/2026: no Kids NÃO mostramos o e-mail do responsável na área
 * da criança — no lugar vai a colocação no ranking + XP (motiva e não vaza o
 * contato dos pais). Fallbacks: sem ranking (poucos alunos na vitrine) → só XP;
 * sem gamificação (best-effort 401) → rótulo neutro; sessão da CONTA (raro dentro
 * do app — o gate de perfil manda escolher um) → `null` (a UI esconde a linha).
 */
export function profileMenuSubtitle(
  gamification: GamificationMeView | null,
  isProfile: boolean,
): string | null {
  if (!isProfile) return null
  if (!gamification) return 'Perfil de criança'
  const xpLabel = `${gamification.xp} XP`
  const position = gamification.ranking?.position
  return position ? `${position}º no ranking · ${xpLabel}` : xpLabel
}
