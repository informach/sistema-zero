import { forwardUpstream } from '@/server/forward'
import { setUserPassword } from '@/server/users'

/** Define a senha manualmente (suporte) via gateway. Corpo `{ password }`. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = (await req.json().catch(() => null)) as { password?: unknown } | null
  const password = typeof json?.password === 'string' ? json.password : ''
  const { status, body } = await setUserPassword(id, password)
  return forwardUpstream({ status, body })
}
