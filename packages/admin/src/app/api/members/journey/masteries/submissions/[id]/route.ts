import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { resolveIdentities } from '@/server/identities'
import { getMasterySubmission } from '@/server/masteries'
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const response = await getMasterySubmission((await context.params).id)
  if (response.status !== 200) return forwardUpstream(response)
  const identityOf = await resolveIdentities([response.body])
  return NextResponse.json({ ...response.body, ...identityOf(response.body) })
}
