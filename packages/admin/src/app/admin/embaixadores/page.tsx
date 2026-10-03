import { getSession } from '@/server/session'
import { ConvitesClient } from './convites-client'

export const dynamic = 'force-dynamic'

export default async function EmbaixadoresPage() {
  // Papel do operador → gating de UX (escrita admin+); os guards reais são do
  // gateway (referrals-admin-write) + referrals (requireAdmin).
  const session = await getSession()
  return <ConvitesClient currentRole={session?.role ?? ''} />
}
