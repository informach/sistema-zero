import {
  isPrivilegedRole,
  resolveStudioTier,
  type StudioTier,
} from '@sistemazero/member-shell/lib/studio-tier'
import { KidsLockedMural } from '@/components/kids/kids-locked-mural'
import { KidsSpaceViewClient, type RemixTier } from '@/components/kids/kids-space-view-client'
import {
  checkStudioAccessReadonly,
  getChallengeReadonly,
  getGamificationReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Mural dos Criadores — vitrine de projetos (servidor `mural-dos-criadores`, modo wall).
 * Mesma régua do Clube: o ACESSO é o **"Quem vê"** do servidor no hub (admin). Sem acesso,
 * o hub devolve BLOQUEADO (teaser) e mostramos `KidsLockedMural`. O Mural é independente
 * do Clube (produto próprio, dado de bônus no desafio do 1º jogo).
 */
export default async function MuralPage() {
  // Posse do Estúdio Completo + RANK do aluno → "Fazer a minha versão" (remix) nos
  // cards. Best-effort: soluço na checagem só esconde o botão (produto vendido à
  // parte). O tema do DESAFIO do mês alimenta a prateleira do topo — visível a quem
  // vê o Mural (participar é que exige Clube+Estúdio; ver não).
  const [session, studioRes, challengeRes, gamRes] = await Promise.all([
    getSession(),
    checkStudioAccessReadonly().catch(() => null),
    getChallengeReadonly().catch(() => null),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const ownsStudio =
    studioRes?.status === 200 && studioRes.body?.access?.['estudio-completo'] === true
  // Remix gated pela CARREIRA além da posse: Faísca ainda não tem o Estúdio livre
  // (o botão importaria um projeto que ela nem consegue abrir). Rank indisponível →
  // sem tier → botão some (conservador; a EQUIPE resolve como Lenda mesmo sem rank).
  let tier: StudioTier | null = null
  if (ownsStudio) {
    const privileged = isPrivilegedRole(session?.role)
    if (gamRes?.status === 200 || privileged) {
      tier = resolveStudioTier(gamRes?.body?.level?.slug ?? 'noob', session?.role)
    }
  }
  const remixTier: RemixTier | null =
    tier?.freeStudio === true
      ? { pro: tier.pro, allowedExtensions: [...tier.allowedExtensions] }
      : null
  const challenge =
    challengeRes?.status === 200 && challengeRes.body
      ? {
          key: challengeRes.body.challenge.key,
          title: challengeRes.body.challenge.title,
          emoji: challengeRes.body.challenge.emoji,
        }
      : null
  return (
    <KidsSpaceViewClient
      slug="mural-dos-criadores"
      viewerId={session?.id ?? ''}
      mode="wall"
      lockedView={<KidsLockedMural />}
      unavailableTitle="Mural dos Criadores"
      remixTier={remixTier}
      challenge={challenge}
    />
  )
}
