import { forwardUpstream } from '@/server/forward'
import { impersonateUser } from '@/server/users'

/** "Entrar como" (suporte): emite o token de handoff de impersonação via gateway.
 *  `?platform=kids` na query → a `communityUrl` devolvida é a do app kids. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const platform = new URL(req.url).searchParams.get('platform') === 'kids' ? 'kids' : undefined
  const { status, body } = await impersonateUser(id, platform)
  return forwardUpstream({ status, body })
}
