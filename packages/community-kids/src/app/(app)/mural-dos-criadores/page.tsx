import { KidsSpaceViewClient } from '@/components/kids/kids-space-view-client'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/** Mural dos Criadores — vitrine de projetos (servidor `mural-dos-criadores`, modo wall). */
export default async function MuralPage() {
  const session = await getSession()
  return <KidsSpaceViewClient slug="mural-dos-criadores" viewerId={session?.id ?? ''} mode="wall" />
}
