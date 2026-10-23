import { getEnv } from '@sistemazero/member-shell/lib/env'
import {
  hasKidsCapability,
  kidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { KidsJourneyLockedPinta } from '@/components/kids/kids-journey-locked-pinta'
import { KidsLockedPinta } from '@/components/kids/kids-locked-pinta'
import { KidsPintaUnavailable } from '@/components/kids/kids-pinta-unavailable'
import { PintaClient } from '@/components/kids/pinta-client'
import { ToolRouteRecado } from '@/components/kids/tool-route-recado'
import { canOpenPensaStudioTask } from '@/lib/pensa-capabilities'
import { toolEarnedInJourney, toolOpensAtLevel } from '@/lib/tool-opens-at'
import {
  checkPintaAccessReadonly,
  getGamificationReadonly,
  getStudioUnlocksReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Pinta — produto vendável (igual ao Estúdio Completo/Pensa): a criança desenha os
 * assets dos jogos (personagens com animações, cenários, peças) e manda pro Estúdio.
 * O gate é resolvido no SERVIDOR (sem acesso → o app nem carrega); os DADOS são
 * locais ao navegador (IndexedDB por perfil) — zero backend próprio.
 *
 * São 4 estados: indisponível, sem o produto, produto comprado mas jornada abaixo
 * de Construtor(a), e acesso completo. A mesma ida também resolve o Estúdio.
 *
 * ⚠️ O Pinta abre junto com o Estúdio livre (Construtor(a)), NÃO com o Pensa/Zappy
 * (Inventor(a)): desenhar não chama IA, então não há custo por uso a adiar.
 */
export default async function PintaPage() {
  // `session.id` = o PERFIL ativo (kids) → a galeria do Pinta e a biblioteca
  // "Meus desenhos" do Estúdio usam o MESMO namespace do IndexedDB do /estudio.
  const [res, session, gam, unlocksRes] = await Promise.all([
    checkPintaAccessReadonly(),
    getSession(),
    getGamificationReadonly().catch(() => null),
    // Só decide o "Levar ao Estúdio": sem bloco conquistado o Estúdio livre está trancado.
    getStudioUnlocksReadonly().catch(() => null),
  ])
  // Os recados rolam na própria caixa: a rota trava a altura na janela (ver `ToolRouteRecado`).
  if (res.status !== 200) return <ToolRouteRecado screen={KidsPintaUnavailable} />
  const hasAccess = res.body?.access?.pinta === true
  if (!hasAccess) {
    const lockedJourney = gam?.status === 200 ? kidsJourneyAccess(gam.body) : null
    const opensAt = toolOpensAtLevel('pinta', lockedJourney)
    const earned = toolEarnedInJourney('pinta', lockedJourney)
    return <ToolRouteRecado screen={<KidsLockedPinta opensAt={opensAt} earned={earned} />} />
  }
  if (gam?.status !== 200) return <ToolRouteRecado screen={KidsPintaUnavailable} />
  const journey = kidsJourneyAccess(gam.body)
  if (!journey) return <ToolRouteRecado screen={KidsPintaUnavailable} />
  if (!hasKidsCapability(journey, 'pinta')) {
    return <ToolRouteRecado screen={KidsJourneyLockedPinta} />
  }
  const studioAvailable = canOpenPensaStudioTask({
    studioProductOwned: res.body?.access?.['estudio-completo'] === true,
    journey,
    unlocks: unlocksRes,
  })
  return (
    <PintaClient
      viewerId={session?.id ?? null}
      studioAvailable={studioAvailable}
      narrationEnabled={Boolean(getEnv().ELEVENLABS_API_KEY)}
    />
  )
}
