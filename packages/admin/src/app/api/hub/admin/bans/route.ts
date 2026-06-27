import { forwardUpstream } from '@/server/forward'
import { createMuteBan } from '@/server/hub'

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createMuteBan('ban', json)
  return forwardUpstream({ status, body })
}
