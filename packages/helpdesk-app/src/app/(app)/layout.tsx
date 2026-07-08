import { ShieldAlert } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppSidebar, MobileNav } from '@/components/layout/app-sidebar'
import { LogoutButton } from '@/components/layout/logout-button'
import { Topbar } from '@/components/layout/topbar'
import { isTeamRole } from '@/lib/types'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  // Defesa em profundidade: além do papel, checa o status. O gateway já exige
  // `active` em toda rota de dados, mas sem isto uma conta inativa veria a shell
  // onde TUDO dá 403 — sem feedback (mesma lição do admin).
  if (!isTeamRole(user.role) || user.status !== 'active') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Acesso negado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({user.email}) não tem acesso ao helpdesk.
          </p>
        </div>
        <LogoutButton />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar user={user} />
      <div className="flex flex-1">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
