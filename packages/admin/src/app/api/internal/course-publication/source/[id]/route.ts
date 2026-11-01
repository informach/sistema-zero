import { getEnv } from '@/lib/env'
import { relayCoursePublication } from '@/server/course-publication-relay'
export const runtime = 'nodejs'
export const maxDuration = 90
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const env = getEnv()
  return relayCoursePublication(request, 'source', [(await context.params).id], {
    membersUrl: env.COURSE_PUBLICATION_MEMBERS_URL,
    environment: env.COURSE_PUBLICATION_ENVIRONMENT,
    sourceToken: env.COURSE_PUBLICATION_SOURCE_TOKEN,
  })
}
