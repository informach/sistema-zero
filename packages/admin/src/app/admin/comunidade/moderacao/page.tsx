import { getSession } from '@/server/session'
import { ModerationClient } from './moderation-client'

export const dynamic = 'force-dynamic'

export default async function ModeracaoPage() {
  const session = await getSession()
  return <ModerationClient currentRole={session?.role ?? ''} />
}
