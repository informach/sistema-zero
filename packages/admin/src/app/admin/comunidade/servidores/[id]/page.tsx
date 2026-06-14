import { getSession } from '@/server/session'
import { SpaceDetailClient } from './space-detail-client'

export const dynamic = 'force-dynamic'

export default async function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  return <SpaceDetailClient spaceId={id} currentRole={session?.role ?? ''} />
}
