import { parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { getCourseBenefitResults } from '@/server/referrals'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const query = new URL(request.url).searchParams
  return forwardUpstream(
    await getCourseBenefitResults((await params).id, {
      audience: query.get('audience') ?? 'kids',
      offset: parseOffset(query.get('offset')),
      from: query.get('from') ?? undefined,
      to: query.get('to') ?? undefined,
    }),
  )
}
