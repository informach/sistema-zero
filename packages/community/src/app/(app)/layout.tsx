import { redirect } from 'next/navigation'
import { CommunityTopnav } from '@/components/community/community-topnav'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/** Shell autenticado do aluno: sessão obrigatória (qualquer conta ativa). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CommunityTopnav user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">{children}</main>
    </div>
  )
}
