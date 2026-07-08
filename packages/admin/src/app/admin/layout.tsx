import { ShieldAlert } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { LogoutButton } from '@/components/admin/logout-button'
import { isAdminRole } from '@/lib/types'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  // Defesa em profundidade: além do papel, checa o status. O gateway já exige
  // `active` em toda rota de dados, mas sem isto um admin inativo veria a shell
  // onde TUDO dá 403 — sem feedback (achado do review).
  if (!isAdminRole(user.role) || user.status !== 'active') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Acesso negado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({user.email}) não tem acesso ao painel.
          </p>
        </div>
        <LogoutButton />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <AdminSidebar user={user} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">{children}</div>
      </main>
    </div>
  )
}
