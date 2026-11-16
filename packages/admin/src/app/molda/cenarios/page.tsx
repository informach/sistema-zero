import { redirect } from 'next/navigation'
import { getEnv } from '@/lib/env'
import { getSession } from '@/server/session'
import { CenariosClient } from './cenarios-client'

export default async function CenariosPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.status !== 'active' || !['admin', 'superadmin'].includes(user.role)) redirect('/admin')
  const env = getEnv()
  const runtimeUrl =
    env.CENARIOS_RUNTIME_URL ??
    (env.NODE_ENV === 'development' ? 'http://127.0.0.1:4531/runtime/entrada.js' : null)
  return runtimeUrl ? (
    <CenariosClient runtimeUrl={runtimeUrl} />
  ) : (
    <main>
      <h1>Molda — Cenários</h1>
      <p>O runtime do editor ainda não foi publicado neste ambiente.</p>
    </main>
  )
}
