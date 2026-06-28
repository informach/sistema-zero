import { KidsAccessUnavailable } from '@/components/kids/kids-access-unavailable'
import { KidsLockedClube } from '@/components/kids/kids-locked-clube'
import { KidsSpaceViewClient } from '@/components/kids/kids-space-view-client'
import { checkClubeAccessReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Clube dos Criadores — produto vendável À PARTE (igual ao Estúdio/Mural): quem tem
 * acesso entra no fórum kids; quem não, vê o recado "ainda não liberado". O gate é
 * resolvido no SERVIDOR (`clube-dos-criadores` = ref do produto; acesso pela CONTA).
 *
 * 3 estados (espelha o Estúdio): members RESPONDEU (200) e não tem o produto → bloqueio
 * real (`KidsLockedClube`); status ≠ 200 (gateway/token soluçou) → "tente de novo"
 * (`KidsAccessUnavailable`), pois mostrar "não liberado" a quem JÁ comprou mentiria.
 */
export default async function ClubePage() {
  const [res, session] = await Promise.all([checkClubeAccessReadonly(), getSession()])
  if (res.status !== 200) return <KidsAccessUnavailable title="Clube dos Criadores" />
  const hasAccess = res.body?.access?.['clube-dos-criadores'] === true
  if (!hasAccess) return <KidsLockedClube />
  return (
    <KidsSpaceViewClient slug="clube-dos-criadores" viewerId={session?.id ?? ''} mode="forum" />
  )
}
