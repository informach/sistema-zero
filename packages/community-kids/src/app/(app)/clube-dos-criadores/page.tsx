import { KidsSpaceViewClient } from '@/components/kids/kids-space-view-client'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/** Clube dos Criadores — a comunidade/fórum kids (servidor `clube-dos-criadores`). */
export default async function ClubePage() {
  const session = await getSession()
  return (
    <KidsSpaceViewClient slug="clube-dos-criadores" viewerId={session?.id ?? ''} mode="forum" />
  )
}
