import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const user = await getSession()
  redirect(user ? '/home' : '/login')
}
