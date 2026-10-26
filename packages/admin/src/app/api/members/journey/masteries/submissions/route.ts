import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { resolveIdentities } from '@/server/identities'
import { getMasteryQueue } from '@/server/masteries'
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const response = await getMasteryQueue({
    audience: query.get('audience') ?? 'kids',
    status: query.get('status') ?? 'pending',
    limit: '30',
    offset: query.get('offset') ?? '0',
  })
  if (response.status !== 200) return forwardUpstream(response)
  const identityOf = await resolveIdentities(response.body.submissions)
  return NextResponse.json({
    ...response.body,
    submissions: response.body.submissions.map((s) => ({ ...s, ...identityOf(s) })),
  })
}
