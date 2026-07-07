import type {
  QuotaUsage,
  QuotaUsageRepository,
} from '../../src/domain/ports/quota-usage-repository.port'
import {
  type SessionStatus,
  type UploadChunkResult,
  type YoutubeApi,
  YoutubeApiError,
  type YoutubeVideoMetadata,
} from '../../src/infrastructure/gateways/youtube/youtube-api.port'

interface FakeSession {
  uri: string
  totalBytes: number
  committed: number
  metadata: YoutubeVideoMetadata
  videoId: string | null
  expired: boolean
}

/**
 * YouTube API roteirizável: sessões resumable em memória com a semântica REAL
 * do protocolo (offset commitado, 308/Range, status-check recupera o videoId
 * de sessão completa) — é o que valida a idempotência do publisher.
 */
export class FakeYoutubeApi implements YoutubeApi {
  readonly sessions = new Map<string, FakeSession>()
  readonly videos = new Map<string, { privacyStatus: string; publishAt: string | null }>()
  readonly thumbnailCalls: string[] = []
  readonly updateCalls: Array<{
    videoId: string
    privacyStatus: string
    publishAt: string | null
  }> = []
  insertCalls = 0
  failInitWith: YoutubeApiError | null = null
  failNextChunkWith: YoutubeApiError | null = null
  failThumbnailWith: YoutubeApiError | null = null
  private seq = 0

  /** Cria uma sessão "de fora" (simula crash pós-init de um processo anterior). */
  seedSession(input: {
    totalBytes: number
    committed: number
    metadata: YoutubeVideoMetadata
    completedVideoId?: string
  }): string {
    const uri = `https://upload.fake/seeded-${++this.seq}`
    const videoId = input.completedVideoId ?? null
    if (videoId) {
      this.videos.set(videoId, {
        privacyStatus: input.metadata.privacyStatus,
        publishAt: input.metadata.publishAt,
      })
    }
    this.sessions.set(uri, {
      uri,
      totalBytes: input.totalBytes,
      committed: input.committed,
      metadata: input.metadata,
      videoId,
      expired: false,
    })
    return uri
  }

  /** Simula o publishAt NATIVO disparando (o YouTube tornou o vídeo público). */
  publishVideo(videoId: string): void {
    const video = this.videos.get(videoId)
    if (video) video.privacyStatus = 'public'
  }

  async initResumableSession(input: {
    accessToken: string
    metadata: YoutubeVideoMetadata
    totalBytes: number
    contentType: string
  }): Promise<string> {
    if (this.failInitWith) {
      const error = this.failInitWith
      this.failInitWith = null
      throw error
    }
    this.insertCalls += 1
    const uri = `https://upload.fake/session-${++this.seq}`
    this.sessions.set(uri, {
      uri,
      totalBytes: input.totalBytes,
      committed: 0,
      metadata: input.metadata,
      videoId: null,
      expired: false,
    })
    return uri
  }

  async checkSessionStatus(uploadUri: string, _totalBytes: number): Promise<SessionStatus> {
    const session = this.sessions.get(uploadUri)
    if (!session || session.expired) throw new YoutubeApiError('gone', 'session_expired')
    if (session.videoId) return { videoId: session.videoId, nextOffset: session.totalBytes }
    return { videoId: null, nextOffset: session.committed }
  }

  async uploadChunk(input: {
    uploadUri: string
    chunk: Uint8Array
    start: number
    totalBytes: number
  }): Promise<UploadChunkResult> {
    const session = this.sessions.get(input.uploadUri)
    if (!session || session.expired) throw new YoutubeApiError('gone', 'session_expired')
    if (this.failNextChunkWith) {
      const error = this.failNextChunkWith
      this.failNextChunkWith = null
      throw error
    }
    if (input.start !== session.committed) {
      throw new YoutubeApiError(
        `offset fora de ordem: ${input.start} (esperado ${session.committed})`,
        'permanent',
      )
    }
    session.committed += input.chunk.byteLength
    if (session.committed >= session.totalBytes) {
      session.videoId = `vid-${++this.seq}`
      this.videos.set(session.videoId, {
        privacyStatus: session.metadata.privacyStatus,
        publishAt: session.metadata.publishAt,
      })
      return { videoId: session.videoId, nextOffset: session.totalBytes }
    }
    return { videoId: null, nextOffset: session.committed }
  }

  async setThumbnail(input: { videoId: string }): Promise<void> {
    if (this.failThumbnailWith) {
      const error = this.failThumbnailWith
      this.failThumbnailWith = null
      throw error
    }
    this.thumbnailCalls.push(input.videoId)
  }

  async getVideoStatus(
    _accessToken: string,
    videoId: string,
  ): Promise<{ privacyStatus: string } | null> {
    const video = this.videos.get(videoId)
    return video ? { privacyStatus: video.privacyStatus } : null
  }

  async updateVideoStatus(input: {
    videoId: string
    privacyStatus: 'private' | 'public'
    publishAt: string | null
  }): Promise<void> {
    const video = this.videos.get(input.videoId)
    if (!video) throw new YoutubeApiError('vídeo inexistente', 'permanent')
    video.privacyStatus = input.privacyStatus
    video.publishAt = input.publishAt
    this.updateCalls.push({
      videoId: input.videoId,
      privacyStatus: input.privacyStatus,
      publishAt: input.publishAt,
    })
  }

  channelStats: {
    channelId: string
    subscriberCount: number
    viewCount: number
    videoCount: number
  } | null = { channelId: 'UC1', subscriberCount: 1234, viewCount: 99_000, videoCount: 42 }
  readonly videoStats = new Map<string, { views: number; likes: number; comments: number }>()
  readonly statsCalls: string[][] = []

  async getChannelStats(): Promise<typeof this.channelStats> {
    return this.channelStats ? { ...this.channelStats } : null
  }

  async getVideoStats(
    _accessToken: string,
    videoIds: string[],
  ): Promise<Map<string, { views: number; likes: number; comments: number }>> {
    this.statsCalls.push([...videoIds])
    const map = new Map<string, { views: number; likes: number; comments: number }>()
    for (const id of videoIds) {
      const stats = this.videoStats.get(id)
      if (stats) map.set(id, { ...stats })
    }
    return map
  }
}

export class InMemoryQuotaUsageRepository implements QuotaUsageRepository {
  readonly rows = new Map<string, QuotaUsage>()

  async get(provider: string, day: string): Promise<QuotaUsage> {
    return this.rows.get(`${provider}:${day}`) ?? { units: 0, uploads: 0 }
  }

  async add(provider: string, day: string, units: number, uploads: number): Promise<QuotaUsage> {
    const current = await this.get(provider, day)
    const next = { units: current.units + units, uploads: current.uploads + uploads }
    this.rows.set(`${provider}:${day}`, next)
    return next
  }
}
