import { updateChallengeTheme } from '@/server/challenge'
import { forwardUpstream } from '@/server/forward'

/** Edita/arquiva tema custom → `PATCH /members/admin/challenge/themes/:id`. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateChallengeTheme(id, json)
  return forwardUpstream({ status, body })
}
