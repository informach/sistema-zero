import { consoleAppLinks } from '@sistemazero/ui/console-apps'
import { ShieldAlert } from 'lucide-react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { LogoutButton } from '@/components/admin/logout-button'
import { PlatformProvider } from '@/components/admin/platform-provider'
import { getEnv } from '@/lib/env'
import { PLATFORM_COOKIE, parsePlatform } from '@/lib/platform'
import { isAdminRole } from '@/lib/types'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  // Seletor global de plataforma: o cookie de preferência é lido AQUI (server)
  // e entrega um snapshot isolado por requisição ao provider client — SSR e
  // hidratação partem do mesmo valor (ausente/lixo → kids, a principal).
  const initialPlatform = parsePlatform((await cookies()).get(PLATFORM_COOKIE)?.value)

  // Defesa em profundidade: além do papel, checa o status. O gateway já exige
  // `active` em toda rota de dados, mas sem isto um admin inativo veria a shell
  // onde TUDO dá 403 — sem feedback (achado do review).
  if (!isAdminRole(user.role) || user.status !== 'active') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-menu p-6 text-center text-menu-text">
        <ShieldAlert className="size-10 text-sun" aria-hidden />
        <div className="max-w-md space-y-2">
          <h1 className="font-display text-2xl font-bold text-white">
            Este admin é só para a equipe
          </h1>
          <p className="text-[15px]">
            A conta {user.email} não tem acesso aqui. Se você é responsável por uma criança, a
            Comunidade dos Criadores fica em outro endereço.
          </p>
        </div>
        <LogoutButton />
      </main>
    )
  }

  const env = getEnv()
  const apps = consoleAppLinks('admin', {
    helpdesk: env.HELPDESK_APP_URL,
    marketing: env.MARKETING_APP_URL,
  })

  return (
    <PlatformProvider initialPlatform={initialPlatform}>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        <AdminSidebar user={user} apps={apps} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-10 md:py-10">{children}</div>
        </main>
      </div>
    </PlatformProvider>
  )
}
