import { getSession } from '@/server/session'
import { ComoFazerClient } from './como-fazer-client'

export const dynamic = 'force-dynamic'

export default async function ComoFazerPage() {
  const session = await getSession()
  return <ComoFazerClient currentRole={session?.role ?? ''} />
}
