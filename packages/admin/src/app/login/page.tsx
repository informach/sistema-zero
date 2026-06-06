import { redirect } from 'next/navigation'
import { safeNextPath } from '@/lib/paths'
import { isAdminRole } from '@/lib/types'
import { getSession } from '@/server/session'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getSession()
  if (user && isAdminRole(user.role)) {
    const { next } = await searchParams
    redirect(safeNextPath(next) ?? '/admin')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </main>
  )
}
