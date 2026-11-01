import 'server-only'
import { createHash } from 'node:crypto'
import { getEnv } from '@/lib/env'
import { getWhitelistDomains } from './vimeo'
import { perfilDaVozDoZappy } from './voz-zappy'

/** No credentials in the seal. All resource calls must use the same destination configuration. */
export function coursePublicationMediaProfile(): string {
  const env = getEnv()
  return createHash('sha256')
    .update(
      JSON.stringify([
        'course-media-profile-v1',
        env.COURSE_PUBLICATION_ENVIRONMENT,
        env.R2_ACCOUNT_ID,
        env.R2_BUCKET,
        env.R2_PRIVATE_BUCKET,
        env.R2_PUBLIC_URL,
        env.VIMEO_FOLDER_ID,
        getWhitelistDomains().sort(),
        perfilDaVozDoZappy(),
      ]),
    )
    .digest('hex')
}
