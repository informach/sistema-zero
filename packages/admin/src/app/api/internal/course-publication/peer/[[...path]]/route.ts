import { getEnv } from '@/lib/env'
import { relayCoursePublication } from '@/server/course-publication-relay'
export const runtime = 'nodejs'
export const maxDuration = 90
async function handle(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const env = getEnv()
  return relayCoursePublication(request, 'peer', (await context.params).path ?? [], {
    membersUrl: env.COURSE_PUBLICATION_MEMBERS_URL,
    environment: env.COURSE_PUBLICATION_ENVIRONMENT,
    peerToken: env.COURSE_PUBLICATION_PEER_TOKEN,
  })
}

export { handle as GET, handle as POST }
