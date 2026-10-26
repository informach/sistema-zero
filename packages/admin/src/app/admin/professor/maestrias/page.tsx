import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { MasteryReviewQueue } from './review-queue'
export const dynamic = 'force-dynamic'
export default async function MasteriesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <MasteryReviewQueue reviewerId={session.id} />
}
