import { meetsFreeCreationLevel } from '@sistemazero/member-shell/server/creative-apps-access'
import { KidsCareerLockedPinta } from '@/components/kids/kids-career-locked-pinta'
import { KidsLockedPinta } from '@/components/kids/kids-locked-pinta'
import { KidsPintaUnavailable } from '@/components/kids/kids-pinta-unavailable'
import { PintaClient } from '@/components/kids/pinta-client'
import { canOpenPensaStudioTask } from '@/lib/pensa-capabilities'
import { checkPintaAccessReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Pinta — produto vendável (igual ao Estúdio Completo/Pensa): a criança desenha os
 * assets dos jogos (personagens com animações, cenários, peças) e manda pro Estúdio.
 * O gate é resolvido no SERVIDOR (sem acesso → o app nem carrega); os DADOS são
 * locais ao navegador (IndexedDB por perfil) — zero backend próprio.
 *
 * São 4 estados: indisponível, sem o produto, produto comprado mas carreira abaixo
 * de Construtor(a), e acesso completo. A mesma ida também resolve o Estúdio.
 *
 * ⚠️ O Pinta abre junto com o Estúdio livre (Construtor(a)), NÃO com o Pensa/Zappy
 * (Inventor(a)): desenhar não chama IA, então não há custo por uso a adiar.
 */
export default async function PintaPage() {
  // `session.id` = o PERFIL ativo (kids) → a galeria do Pinta e a biblioteca
  // "Meus desenhos" do Estúdio usam o MESMO namespace do IndexedDB do /estudio.
  const [res, session, gam] = await Promise.all([
    checkPintaAccessReadonly(),
    getSession(),
    getGamificationReadonly().catch(() => null),
  ])
  if (res.status !== 200) return <KidsPintaUnavailable />
  const hasAccess = res.body?.access?.pinta === true
  if (!hasAccess) return <KidsLockedPinta />
  if (gam?.status !== 200) return <KidsPintaUnavailable />
  if (!meetsFreeCreationLevel(gam.body?.level?.slug, session?.role)) {
    return <KidsCareerLockedPinta />
  }
  const studioAvailable = canOpenPensaStudioTask({
    studioProductOwned: res.body?.access?.['estudio-completo'] === true,
    levelSlug: gam?.status === 200 ? gam.body?.level?.slug : undefined,
    role: session?.role,
  })
  return <PintaClient viewerId={session?.id ?? null} studioAvailable={studioAvailable} />
}
