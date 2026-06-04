import { redirect } from 'next/navigation'
import { CommunityTopnav } from '@/components/community/community-topnav'
import { getMeReadonly } from '@/server/auth'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/** Shell autenticado do aluno: sessão obrigatória (qualquer conta ativa). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  // Avatar não vive nas claims do JWT → hidrata fresco do auth, best-effort e
  // SOMENTE-LEITURA (layout é Server Component: refresh/escrita de cookie aqui
  // LANÇA — "Cookies can only be modified in a Server Action or Route Handler").
  // Access expirado/gateway fora → 401 → header cai no fallback de iniciais.
  const me = await getMeReadonly()
  const avatarUrl = me.status === 200 ? (me.body?.user?.avatarUrl ?? null) : null
  const user = { ...session, avatarUrl }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CommunityTopnav user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">{children}</main>
    </div>
  )
}
