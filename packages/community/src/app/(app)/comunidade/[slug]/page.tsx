import { getSession } from '@/server/session'
import { SpaceViewClient } from './space-view-client'

export const dynamic = 'force-dynamic'

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession()
  return <SpaceViewClient slug={slug} viewerId={session?.id ?? ''} />
}
