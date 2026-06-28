import { KidsAccessUnavailable } from '@/components/kids/kids-access-unavailable'
import { KidsLockedMural } from '@/components/kids/kids-locked-mural'
import { KidsSpaceViewClient } from '@/components/kids/kids-space-view-client'
import { checkMuralAccessReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Mural dos Criadores — vitrine de projetos (servidor `mural-dos-criadores`, modo wall).
 * Produto vendável À PARTE (independente do Clube; bônus do desafio do 1º jogo): quem tem
 * acesso vê a vitrine; quem não, vê o recado "ainda não liberado". Gate no SERVIDOR
 * (`mural-dos-criadores` = ref do produto; acesso pela CONTA), 3 estados — espelha o
 * Estúdio/Clube (200 sem produto → `KidsLockedMural`; status ≠ 200 → `KidsAccessUnavailable`).
 */
export default async function MuralPage() {
  const [res, session] = await Promise.all([checkMuralAccessReadonly(), getSession()])
  if (res.status !== 200) return <KidsAccessUnavailable title="Mural dos Criadores" />
  const hasAccess = res.body?.access?.['mural-dos-criadores'] === true
  if (!hasAccess) return <KidsLockedMural />
  return <KidsSpaceViewClient slug="mural-dos-criadores" viewerId={session?.id ?? ''} mode="wall" />
}
