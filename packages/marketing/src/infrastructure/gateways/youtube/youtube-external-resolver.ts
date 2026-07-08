import type {
  ExternalPostResolver,
  ResolvedExternalPost,
} from '../../../domain/ports/external-post-resolver.port'

const PATTERNS = [
  /[?&]v=([A-Za-z0-9_-]{8,20})/, // watch?v=<id>
  /youtu\.be\/([A-Za-z0-9_-]{8,20})/, // youtu.be/<id>
  /\/shorts\/([A-Za-z0-9_-]{8,20})/, // /shorts/<id>
  /\/live\/([A-Za-z0-9_-]{8,20})/, // /live/<id>
]

/** YouTube: o videoId está NA URL — regex puro, sem chamada de API. */
export class YoutubeExternalResolver implements ExternalPostResolver {
  readonly network = 'youtube' as const
  readonly requiresAccount = false

  async resolve(input: { url: string }): Promise<ResolvedExternalPost | null> {
    for (const pattern of PATTERNS) {
      const match = input.url.match(pattern)
      if (match?.[1]) return { externalPostId: match[1], externalUrl: input.url }
    }
    return null
  }
}
