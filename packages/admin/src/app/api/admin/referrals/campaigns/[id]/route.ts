import { forwardUpstream } from '@/server/forward'
import { getCampaign, saveCampaign } from '@/server/referrals'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return forwardUpstream(
    await getCampaign(
      (await params).id,
      new URL(req.url).searchParams.get('audience') ?? undefined,
    ),
  )
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return forwardUpstream(await saveCampaign(await req.json().catch(() => null), (await params).id))
}
