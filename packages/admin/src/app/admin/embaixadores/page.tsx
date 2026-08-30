import { getSession } from '@/server/session'
import { EmbaixadoresClient } from './embaixadores-client'

export const dynamic = 'force-dynamic'

export default async function EmbaixadoresPage() {
  // Papel do operador → gating de UX (escrita admin+); os guards reais são do
  // gateway (referrals-admin-write) + referrals (requireAdmin).
  const session = await getSession()
  return <EmbaixadoresClient currentRole={session?.role ?? ''} />
}
