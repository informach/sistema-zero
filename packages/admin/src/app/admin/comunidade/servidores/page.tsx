import { getSession } from '@/server/session'
import { ServersClient } from './servers-client'

export const dynamic = 'force-dynamic'

export default async function ServidoresPage() {
  const session = await getSession()
  return <ServersClient currentRole={session?.role ?? ''} />
}
