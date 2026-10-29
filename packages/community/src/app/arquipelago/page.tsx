import { ArquipelagoHostAdulto } from '@sistemazero/member-shell/components/arquipelago-host-adulto'
import { learnerIdentity } from '@sistemazero/member-shell/lib/learner-identity'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Arquipélago Vagalume' }

export default async function ArquipelagoPage() {
  const session = await getSession()
  if (!session || !learnerIdentity(session, 'adult')) redirect('/login')
  const primeiroNome = session.firstName?.trim().split(/\s+/)[0] || 'Criador'
  return <ArquipelagoHostAdulto perfil={{ id: session.id, primeiroNome }} voltarPara="/" />
}
