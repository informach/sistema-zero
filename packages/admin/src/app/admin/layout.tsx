import { ShieldAlert } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AdminTopbar } from '@/components/admin/admin-topbar'
import { LogoutButton } from '@/components/admin/logout-button'
import { isAdminRole } from '@/lib/types'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  if (!isAdminRole(user.role)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Acesso negado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({user.email}) não tem permissão para o painel.
          </p>
        </div>
        <LogoutButton />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminTopbar user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
    </div>
  )
}
