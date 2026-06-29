import { KidsLockedClube } from '@/components/kids/kids-locked-clube'
import { KidsSpaceViewClient } from '@/components/kids/kids-space-view-client'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Clube dos Criadores — fórum kids (servidor `clube-dos-criadores`). O ACESSO é decidido
 * por UM portão só: o **"Quem vê"** do servidor no hub (admin). Se a criança não tem
 * acesso, o hub devolve o servidor BLOQUEADO (teaser) e mostramos `KidsLockedClube`
 * ("ainda não liberado"); com acesso, entra no fórum. Para vender como produto, o admin
 * põe "Quem vê = Por comunidade" com a chave do produto Clube (ver hub/CLAUDE.md).
 */
export default async function ClubePage() {
  const session = await getSession()
  return (
    <KidsSpaceViewClient
      slug="clube-dos-criadores"
      viewerId={session?.id ?? ''}
      mode="forum"
      lockedView={<KidsLockedClube />}
      unavailableTitle="Clube dos Criadores"
    />
  )
}
