import { parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { getOriginDetail } from '@/server/referrals'

/** Números, vendas por oferta e pessoas que entraram por esta origem (admin+). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return forwardUpstream(
    await getOriginDetail(
      'campaigns',
      (await params).id,
      parseOffset(new URL(req.url).searchParams.get('offset')),
    ),
  )
}
