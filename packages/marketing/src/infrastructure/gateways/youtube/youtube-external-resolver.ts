import type {
  ExternalPostResolver,
  ResolvedExternalPost,
} from '../../../domain/ports/external-post-resolver.port'

import { youtubeVideoId } from '../../../domain/publication/post-url'
import type { SocialAccount } from '../../../domain/social-account/social-account'

export interface YoutubePostLookup {
  getPublishedVideo(
    accessToken: string,
    videoId: string,
  ): Promise<{ channelId: string; privacyStatus: string } | null>
}

/** Lookup verifies the channel and published state; without it this only parses the URL. */
export class YoutubeExternalResolver implements ExternalPostResolver {
  readonly network = 'youtube' as const
  readonly requiresAccount: boolean
  constructor(private readonly lookup?: YoutubePostLookup) {
    this.requiresAccount = Boolean(lookup)
  }

  async resolve(input: {
    url: string
    account?: SocialAccount | null
    accessToken?: string | null
  }): Promise<ResolvedExternalPost | null> {
    const id = youtubeVideoId(input.url)
    if (!id) return null
    if (this.lookup) {
      if (input.account?.network !== 'youtube' || !input.accessToken) return null
      const video = await this.lookup.getPublishedVideo(input.accessToken, id)
      if (
        !video ||
        video.channelId !== input.account.externalId ||
        !['public', 'unlisted'].includes(video.privacyStatus)
      )
        return null
    }
    return { externalPostId: id, externalUrl: `https://www.youtube.com/watch?v=${id}` }
  }
}
