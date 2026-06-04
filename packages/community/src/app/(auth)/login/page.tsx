import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getSession()
  if (user) redirect('/home')
  return <LoginForm />
}
