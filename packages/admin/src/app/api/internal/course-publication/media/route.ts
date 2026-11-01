import { planCoursePublicationMedia } from '@/lib/course-publication-plan'
import { getEnv } from '@/lib/env'
import { handleCoursePublicationMedia } from '@/server/course-publication-endpoint'
import { executeCoursePublicationMedia } from '@/server/course-publication-media'
import { coursePublicationMediaProfile } from '@/server/course-publication-profile'

export const runtime = 'nodejs'
export const maxDuration = 90
export function POST(request: Request) {
  const env = getEnv()
  const profileHash = coursePublicationMediaProfile()
  return handleCoursePublicationMedia(request, {
    token: env.COURSE_PUBLICATION_MEDIA_TOKEN,
    environment: env.COURSE_PUBLICATION_ENVIRONMENT,
    profileHash,
    plan: (documents) => planCoursePublicationMedia(documents, profileHash),
    execute: executeCoursePublicationMedia,
  })
}
