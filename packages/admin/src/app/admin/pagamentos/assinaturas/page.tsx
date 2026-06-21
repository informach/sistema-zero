import { getSession } from '@/server/session'
import { SubscriptionsClient } from './subscriptions-client'

export const dynamic = 'force-dynamic'

export default async function AssinaturasPage() {
  const session = await getSession()
  return <SubscriptionsClient currentRole={session?.role ?? ''} />
}
