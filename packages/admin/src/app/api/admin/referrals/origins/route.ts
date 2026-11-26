import { forwardUpstream } from '@/server/forward'
import { getOriginReport } from '@/server/referrals'

/** Origem das vendas do período (admin+; o referrals e o gateway conferem o papel). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  return forwardUpstream(
    await getOriginReport({
      audience: params.get('audience') ?? undefined,
      from: params.get('from') ?? undefined,
      to: params.get('to') ?? undefined,
    }),
  )
}
