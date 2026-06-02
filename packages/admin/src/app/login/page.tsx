import { redirect } from 'next/navigation'
import { isAdminRole } from '@/lib/types'
import { getSession } from '@/server/session'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getSession()
  if (user && isAdminRole(user.role)) redirect('/admin')

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </main>
  )
}
