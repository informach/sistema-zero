import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { AccountClient } from './account-client'

export const dynamic = 'force-dynamic'

/** Os dados da conta chegam pelos BFFs dos pais, que conferem a sessão de responsável de novo. */
export default async function ContaPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  return <AccountClient parentName={session.firstName} />
}
