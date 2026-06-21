import { getSession } from '@/server/session'
import { InvoicesClient } from './invoices-client'

export const dynamic = 'force-dynamic'

export default async function NotasFiscaisPage() {
  const session = await getSession()
  return <InvoicesClient currentRole={session?.role ?? ''} />
}
