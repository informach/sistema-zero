import { getEnv } from '@sistemazero/member-shell/lib/env'
import {
  hasKidsCapability,
  kidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { KidsJourneyLockedMolda } from '@/components/kids/kids-journey-locked-molda'
import { KidsLockedMolda } from '@/components/kids/kids-locked-molda'
import { KidsMoldaUnavailable } from '@/components/kids/kids-molda-unavailable'
import { MoldaClient } from '@/components/kids/molda-client'
import { ToolRouteRecado } from '@/components/kids/tool-route-recado'
import { moldaToolAccessFor } from '@/lib/molda-tool-access'
import { canOpenPensaStudioTask } from '@/lib/pensa-capabilities'
import { toolEarnedInJourney, toolOpensAtLevel } from '@/lib/tool-opens-at'
import {
  checkMoldaAccessReadonly,
  getGamificationReadonly,
  getStudioUnlocksReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Molda — produto vendável (igual ao Pinta): a oficina 3D onde a criança monta
 * modelos low poly, pinta texturas e cria céus 360° para os jogos 3D do Estúdio.
 * O gate é resolvido no SERVIDOR (sem acesso → o app nem carrega); os DADOS são
 * locais ao navegador (IndexedDB por perfil) — zero backend próprio.
 *
 * São 4 estados: indisponível, sem o produto, produto comprado mas jornada abaixo
 * do Explorador(a) de Mundos, e acesso completo. A mesma ida também resolve o Estúdio
 * (`studioOwned` do adapter: atalho e dica do "Trazer do Molda").
 *
 * O seed abre no Explorador(a) de Mundos; a configuração publicada decide quando cada
 * perfil ganha a capacidade. Produto, paleta e criação salva permanecem independentes.
 *
 * As faixas vêm das capacidades canônicas do perfil. A equipe usa a prévia própria do
 * Members, sem posto virtual; a inspeção pedagógica da política pertence ao Admin.
 */
export default async function MoldaPage() {
  const session = await getSession()
  const [res, gam, unlocksRes] = await Promise.all([
    checkMoldaAccessReadonly(),
    getGamificationReadonly().catch(() => null),
    // Só decide o "Levar ao Estúdio": sem bloco conquistado o Estúdio livre está trancado.
    getStudioUnlocksReadonly().catch(() => null),
  ])
  // Os recados rolam na própria caixa: a rota trava a altura na janela (ver `ToolRouteRecado`).
  if (res.status !== 200) return <ToolRouteRecado screen={KidsMoldaUnavailable} />
  const hasAccess = res.body?.access?.molda === true
  if (!hasAccess) {
    const lockedJourney = gam?.status === 200 ? kidsJourneyAccess(gam.body) : null
    const opensAt = toolOpensAtLevel('molda', lockedJourney)
    const earned = toolEarnedInJourney('molda', lockedJourney)
    return <ToolRouteRecado screen={<KidsLockedMolda opensAt={opensAt} earned={earned} />} />
  }
  if (gam?.status !== 200) return <ToolRouteRecado screen={KidsMoldaUnavailable} />
  const journey = kidsJourneyAccess(gam.body)
  if (!journey) return <ToolRouteRecado screen={KidsMoldaUnavailable} />
  if (!hasKidsCapability(journey, 'molda')) {
    return <ToolRouteRecado screen={KidsJourneyLockedMolda} />
  }
  const studioAvailable = canOpenPensaStudioTask({
    studioProductOwned: res.body?.access?.['estudio-completo'] === true,
    journey,
    unlocks: unlocksRes,
  })
  const toolAccess = moldaToolAccessFor({ journey })
  return (
    <MoldaClient
      key={session?.id ?? 'local'}
      viewerId={session?.id ?? null}
      studioAvailable={studioAvailable}
      toolAccess={toolAccess ?? null}
      narrationEnabled={Boolean(getEnv().ELEVENLABS_API_KEY)}
    />
  )
}
