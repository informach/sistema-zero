import { releaseConfigurationSchema } from '../src/shared/updates'

export function releaseConfiguration(env: NodeJS.ProcessEnv, required: boolean) {
  const feedUrl = env.MARKETING_DESKTOP_UPDATE_URL
  const publishers = env.MARKETING_DESKTOP_PUBLISHERS
  if (!required && !feedUrl && !publishers) return null
  if (!feedUrl || !publishers)
    throw new Error(
      'Configure MARKETING_DESKTOP_UPDATE_URL e MARKETING_DESKTOP_PUBLISHERS para a distribuição assinada.',
    )
  return releaseConfigurationSchema.parse({
    schemaVersion: 1,
    feedUrl,
    publisherNames: publishers.split('|'),
  })
}
