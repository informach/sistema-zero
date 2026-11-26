import { forwardUpstream } from '@/server/forward'
import { listCourseBenefits } from '@/server/referrals'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  return forwardUpstream(
    await listCourseBenefits(query.get('audience') ?? 'kids', query.get('courseSlug') ?? undefined),
  )
}
