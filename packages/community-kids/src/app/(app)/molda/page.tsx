import { meetsThreeDCreationLevel } from '@sistemazero/member-shell/server/creative-apps-access'
import { KidsCareerLockedMolda } from '@/components/kids/kids-career-locked-molda'
import { KidsLockedMolda } from '@/components/kids/kids-locked-molda'
import { KidsMoldaUnavailable } from '@/components/kids/kids-molda-unavailable'
import { MoldaClient } from '@/components/kids/molda-client'
import { canOpenPensaStudioTask } from '@/lib/pensa-capabilities'
import { checkMoldaAccessReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Molda — produto vendável (igual ao Pinta): a oficina 3D onde a criança monta
 * modelos low poly, pinta texturas e cria céus 360° para os jogos 3D do Estúdio.
 * O gate é resolvido no SERVIDOR (sem acesso → o app nem carrega); os DADOS são
 * locais ao navegador (IndexedDB por perfil) — zero backend próprio.
 *
 * São 4 estados: indisponível, sem o produto, produto comprado mas carreira abaixo
 * do Explorador(a) de Mundos, e acesso completo. A mesma ida também resolve o Estúdio
 * (`studioOwned` do adapter: atalho e dica do "Trazer do Molda").
 *
 * ⚠️ O Molda abre no Explorador(a) de Mundos (`THREE_D_CREATION_MIN_LEVEL`, decisão dela
 * 05/09/2026): é o posto que ganha o kit Jogo 3D no Estúdio, o consumidor do que a
 * oficina produz — NÃO no Construtor(a) do Pinta nem no Inventor(a) da IA.
 */
export default async function MoldaPage() {
  // `session.id` = o PERFIL ativo (kids) → a galeria do Molda usa o MESMO
  // namespace do IndexedDB do /estudio e do /pinta.
  const [res, session, gam] = await Promise.all([
    checkMoldaAccessReadonly(),
    getSession(),
    getGamificationReadonly().catch(() => null),
  ])
  if (res.status !== 200) return <KidsMoldaUnavailable />
  const hasAccess = res.body?.access?.molda === true
  if (!hasAccess) return <KidsLockedMolda />
  if (gam?.status !== 200) return <KidsMoldaUnavailable />
  if (!meetsThreeDCreationLevel(gam.body?.level?.slug, session?.role)) {
    return <KidsCareerLockedMolda />
  }
  const studioAvailable = canOpenPensaStudioTask({
    studioProductOwned: res.body?.access?.['estudio-completo'] === true,
    levelSlug: gam.body?.level?.slug,
    role: session?.role,
  })
  return <MoldaClient viewerId={session?.id ?? null} studioAvailable={studioAvailable} />
}
