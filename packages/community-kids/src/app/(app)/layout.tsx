import { ImpersonationBanner } from '@sistemazero/member-shell/components/impersonation-banner'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/kids/app-sidebar'
import { MobileTabbar, MobileTopbar } from '@/components/kids/mobile-nav'
import { actorLabel } from '@/lib/act'
import { getMeReadonly } from '@/server/auth'
import { getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Shell autenticado do aluno: sessão obrigatória (qualquer conta ativa).
 * Navegação estilo Duolingo — sidebar fixa no desktop, top bar + tab bar
 * inferior no mobile (o pb-24 do main respira acima da tab bar).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  // Avatar não vive nas claims do JWT → hidrata fresco do auth, best-effort e
  // SOMENTE-LEITURA (layout é Server Component: refresh/escrita de cookie aqui
  // LANÇA — "Cookies can only be modified in a Server Action or Route Handler").
  // Access expirado/gateway fora → 401 → header cai no fallback de iniciais.
  // Gamificação segue a mesma régua: best-effort, 401 → widget some.
  const [me, gam] = await Promise.all([getMeReadonly(), getGamificationReadonly()])
  const avatarUrl = me.status === 200 ? (me.body?.user?.avatarUrl ?? null) : null
  const gamification = gam.status === 200 ? (gam.body ?? null) : null
  const user = { ...session, avatarUrl }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sessão de impersonação (suporte): faixa persistente acima de tudo. */}
      {session.act ? (
        <ImpersonationBanner
          studentName={`${session.firstName} ${session.lastName}`.trim() || session.email}
          actorName={actorLabel(session.act)}
        />
      ) : null}
      <div className="flex flex-1">
        <AppSidebar user={user} gamification={gamification} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopbar user={user} gamification={gamification} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
            {children}
          </main>
          <MobileTabbar />
        </div>
      </div>
    </div>
  )
}
