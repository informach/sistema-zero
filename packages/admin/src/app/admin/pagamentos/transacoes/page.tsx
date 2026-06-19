import { getSession } from '@/server/session'
import { TransactionsClient } from './transactions-client'

export const dynamic = 'force-dynamic'

export default async function TransacoesPage() {
  const session = await getSession()
  return <TransactionsClient currentRole={session?.role ?? ''} />
}
