import { publicLinkQr } from '@sistemazero/member-shell/server/public-link-qr'
import { forwardUpstream } from '@/server/forward'
import { getCampaign } from '@/server/referrals'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getCampaign((await params).id)
  if (result.status !== 200 || !result.body?.campaign) return forwardUpstream(result)
  const image = await publicLinkQr(result.body.campaign.shareUrl)
  return new Response(new Uint8Array(image), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'private, no-store',
      'content-disposition': `attachment; filename="campanha-${result.body.campaign.code}.png"`,
    },
  })
}
