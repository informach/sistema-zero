import { forwardUpstream } from '@/server/forward'
import { listAmbassadorOffers, saveAmbassadorOffers } from '@/server/referrals'

/** As listas de ofertas dos embaixadores (Campanhas › Ofertas dos embaixadores). */
export async function GET(req: Request) {
  return forwardUpstream(
    await listAmbassadorOffers(new URL(req.url).searchParams.get('audience') ?? undefined),
  )
}
export async function PUT(req: Request) {
  return forwardUpstream(await saveAmbassadorOffers(await req.json().catch(() => null)))
}
