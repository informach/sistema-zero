import { KidsLockedMural } from '@/components/kids/kids-locked-mural'
import { KidsSpaceViewClient } from '@/components/kids/kids-space-view-client'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Mural dos Criadores — vitrine de projetos (servidor `mural-dos-criadores`, modo wall).
 * Mesma régua do Clube: o ACESSO é o **"Quem vê"** do servidor no hub (admin). Sem acesso,
 * o hub devolve BLOQUEADO (teaser) e mostramos `KidsLockedMural`. O Mural é independente
 * do Clube (produto próprio, dado de bônus no desafio do 1º jogo).
 */
export default async function MuralPage() {
  const session = await getSession()
  return (
    <KidsSpaceViewClient
      slug="mural-dos-criadores"
      viewerId={session?.id ?? ''}
      mode="wall"
      lockedView={<KidsLockedMural />}
      unavailableTitle="Mural dos Criadores"
    />
  )
}
