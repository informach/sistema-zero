import { forwardUpstream } from '@/server/forward'
import { getCampaign, saveCampaign } from '@/server/referrals'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return forwardUpstream(await getCampaign((await params).id))
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return forwardUpstream(await saveCampaign(await req.json().catch(() => null), (await params).id))
}
