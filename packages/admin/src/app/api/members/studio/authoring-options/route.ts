import { forwardUpstream } from '@/server/forward'
import { getStudioAuthoringOptions } from '@/server/members'

export async function GET() {
  const response = forwardUpstream(await getStudioAuthoringOptions())
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
