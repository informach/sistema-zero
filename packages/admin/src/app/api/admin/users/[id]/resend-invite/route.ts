import { forwardUpstream } from '@/server/forward'
import { resendInvite } from '@/server/users'

/** Reenvia o convite (link de 1º acesso) via gateway. `?platform=kids` → link do app kids. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const platform = new URL(req.url).searchParams.get('platform') === 'kids' ? 'kids' : undefined
  const { status, body } = await resendInvite(id, platform)
  return forwardUpstream({ status, body })
}
