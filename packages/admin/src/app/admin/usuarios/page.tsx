import { getSession } from '@/server/session'
import { UsersClient } from './users-client'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  // O operador atual (do gate do layout) guia o gating de UX no client — a fonte da
  // verdade dos guards é o @sistemazero/auth (servidor).
  const session = await getSession()
  return <UsersClient currentUser={{ id: session?.id ?? '', role: session?.role ?? '' }} />
}
