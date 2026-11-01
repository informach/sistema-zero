import { getEnv } from '@/lib/env'
import { coursePublicationMediaProfile } from '@/server/course-publication-profile'
import { createCourseTransferService } from '@/server/course-transfer'
import { handleCourseTransfer } from '@/server/course-transfer-endpoint'
import { productionCourseVideoCopier } from '@/server/course-video-provider'
import { r2CopyCourseObject, r2HeadCourseObject, r2ReadCourseObject } from '@/server/r2'

export const runtime = 'nodejs'
export const maxDuration = 90
export function POST(request: Request) {
  const env = getEnv()
  const service =
    env.COURSE_PUBLICATION_ENVIRONMENT === 'production' &&
    env.COURSE_PROMOTION_SOURCE_PUBLIC_URL &&
    env.COURSE_PROMOTION_SOURCE_BUCKET &&
    env.COURSE_PROMOTION_SOURCE_PRIVATE_BUCKET &&
    env.COURSE_PROMOTION_SOURCE_FUNNEL_URL &&
    env.COURSE_PROMOTION_TARGET_FUNNEL_URL &&
    env.R2_PUBLIC_URL &&
    env.R2_BUCKET &&
    env.R2_PRIVATE_BUCKET
      ? createCourseTransferService(
          {
            origin: {
              publicBaseUrl: env.COURSE_PROMOTION_SOURCE_PUBLIC_URL,
              publicBucket: env.COURSE_PROMOTION_SOURCE_BUCKET,
              privateBucket: env.COURSE_PROMOTION_SOURCE_PRIVATE_BUCKET,
            },
            destination: {
              publicBaseUrl: env.R2_PUBLIC_URL,
              publicBucket: env.R2_BUCKET,
              privateBucket: env.R2_PRIVATE_BUCKET,
            },
            sales: {
              staging: env.COURSE_PROMOTION_SOURCE_FUNNEL_URL,
              production: env.COURSE_PROMOTION_TARGET_FUNNEL_URL,
            },
            mediaProfileHash: coursePublicationMediaProfile(),
          },
          {
            head: r2HeadCourseObject,
            read: r2ReadCourseObject,
            copy: r2CopyCourseObject,
            video: productionCourseVideoCopier(request.signal),
          },
        )
      : undefined
  return handleCourseTransfer(request, {
    token: env.COURSE_PUBLICATION_MEDIA_TOKEN,
    environment: env.COURSE_PUBLICATION_ENVIRONMENT,
    service,
  })
}
