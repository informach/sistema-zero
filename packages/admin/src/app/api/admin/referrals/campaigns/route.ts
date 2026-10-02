import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { listCampaigns, saveCampaign } from '@/server/referrals'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  return forwardUpstream(
    await listCampaigns({
      q: searchParams.get('q') ?? undefined,
      limit: parseLimit(searchParams.get('limit')),
      offset: parseOffset(searchParams.get('offset')),
    }),
  )
}
export async function POST(req: Request) {
  return forwardUpstream(await saveCampaign(await req.json().catch(() => null)))
}
