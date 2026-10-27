import { ArquipelagoHost } from '@sistemazero/member-shell/components/arquipelago-host'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Arquipélago Vagalume' }

/**
 * Arquipélago Vagalume: a página só hospeda o jogo (publicado à parte e carregado pelo
 * manifesto). Quem pode jogar é decidido pelo serviço do jogo; sem o serviço, o recado diz que
 * ainda não abriu. O menu também consulta essa liberação.
 */
export default async function ArquipelagoPage() {
  const session = await getSession()
  if (!session?.activeProfile) redirect('/perfis')
  const primeiroNome = (session.activeProfile.name ?? '').trim().split(/\s+/)[0] || 'Criador'
  return <ArquipelagoHost publico="kids" perfil={{ id: session.id, primeiroNome }} voltarPara="/" />
}
