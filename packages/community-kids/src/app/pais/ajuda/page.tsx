import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { HelpContent } from './help-content'

export const dynamic = 'force-dynamic'

export default async function AjudaPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  return <HelpContent parentName={session.firstName} />
}
