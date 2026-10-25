import { getSession } from '@/server/session'
import { RecoveryPolicyClient } from './recovery-policy-client'

export const dynamic = 'force-dynamic'
export default async function RegularizacaoPage() {
  const session = await getSession()
  return <RecoveryPolicyClient currentRole={session?.role ?? ''} />
}
