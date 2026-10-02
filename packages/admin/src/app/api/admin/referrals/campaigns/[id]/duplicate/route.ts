import { forwardUpstream } from '@/server/forward'
import { saveCampaign } from '@/server/referrals'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return forwardUpstream(
    await saveCampaign(await req.json().catch(() => null), (await params).id, true),
  )
}
