import { parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { getOriginDetail } from '@/server/referrals'

/** Números, vendas por oferta e pessoas que entraram por esta origem (admin+). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const search = new URL(req.url).searchParams
  return forwardUpstream(
    await getOriginDetail(
      'ambassadors',
      (await params).id,
      parseOffset(search.get('offset')),
      search.get('audience') ?? undefined,
    ),
  )
}
