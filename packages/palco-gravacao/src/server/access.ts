import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE, type StaffUser, verifyAccess } from './session'

/** O token da equipe deste pedido (o proxy já o renovou, se venceu) e quem é. */
export async function staffAccess(): Promise<{ token: string; user: StaffUser } | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  const verdict = await verifyAccess(token)
  return token && verdict.ok ? { token, user: verdict.user } : null
}
