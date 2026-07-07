import {
  type SessionStatus,
  type UploadChunkResult,
  type YoutubeApi,
  YoutubeApiError,
  type YoutubeVideoMetadata,
} from './youtube-api.port'

/**
 * Cliente da YouTube Data API v3 com fetch nativo (upload resumable + status).
 * Protocolo do resumable: POST `uploadType=resumable` devolve o uploadUri no
 * header `Location`; chunks vão em PUT com `Content-Range: bytes a-b/total`
 * (intermediários respondem 308 com o header `Range: bytes=0-N`); PUT vazio
 * com `Content-Range: bytes *\/total` consulta/retoma a sessão — é o que torna
 * o retry pós-crash IDEMPOTENTE (recupera o videoId sem novo insert).
 */
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
const THUMBNAILS_URL = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set'
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels'

const JSON_TIMEOUT_MS = 15_000
/** Chunk de 8MiB numa rede lenta leva minutos — timeout generoso próprio. */
const CHUNK_TIMEOUT_MS = 10 * 60_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('youtube timeout', 'TimeoutError')),
    timeoutMs,
  )
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    throw new YoutubeApiError('Falha de rede ao falar com o YouTube', 'retryable', {
      cause: error,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Classifica um status HTTP fora do fluxo esperado. */
async function classify(res: Response, context: string): Promise<YoutubeApiError> {
  const body = await res.text().catch(() => '')
  const lower = body.toLowerCase()
  if (res.status === 401) return new YoutubeApiError(`${context}: token inválido (401)`, 'token')
  if (res.status === 403 && (lower.includes('quotaexceeded') || lower.includes('uploadlimit'))) {
    return new YoutubeApiError(`${context}: quota diária esgotada (403)`, 'quota')
  }
  if (res.status === 404 || res.status === 410) {
    return new YoutubeApiError(
      `${context}: sessão de upload expirada (${res.status})`,
      'session_expired',
    )
  }
  if (res.status >= 400 && res.status < 500) {
    return new YoutubeApiError(`${context}: ${res.status} ${body.slice(0, 300)}`, 'permanent')
  }
  return new YoutubeApiError(`${context}: ${res.status}`, 'retryable')
}

/** Header `Range: bytes=0-N` do 308 → próximo offset (N+1). Ausente = 0. */
function nextOffsetFromRange(res: Response): number {
  const range = res.headers.get('range')
  const match = range?.match(/bytes=0-(\d+)/)
  return match?.[1] ? Number(match[1]) + 1 : 0
}

export class YoutubeClient implements YoutubeApi {
  async initResumableSession(input: {
    accessToken: string
    metadata: YoutubeVideoMetadata
    totalBytes: number
    contentType: string
  }): Promise<string> {
    const url = new URL(UPLOAD_URL)
    url.searchParams.set('uploadType', 'resumable')
    url.searchParams.set('part', 'snippet,status')
    const status: Record<string, unknown> = {
      privacyStatus: input.metadata.privacyStatus,
      selfDeclaredMadeForKids: false,
    }
    if (input.metadata.publishAt) status.publishAt = input.metadata.publishAt
    const res = await fetchWithTimeout(
      url.toString(),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json; charset=UTF-8',
          'x-upload-content-length': String(input.totalBytes),
          'x-upload-content-type': input.contentType,
        },
        body: JSON.stringify({
          snippet: {
            title: input.metadata.title,
            description: input.metadata.description,
            tags: input.metadata.tags,
          },
          status,
        }),
      },
      JSON_TIMEOUT_MS,
    )
    if (!res.ok) throw await classify(res, 'videos.insert (init)')
    const location = res.headers.get('location')
    if (!location) throw new YoutubeApiError('init sem header Location', 'retryable')
    return location
  }

  async checkSessionStatus(uploadUri: string, totalBytes: number): Promise<SessionStatus> {
    const res = await fetchWithTimeout(
      uploadUri,
      {
        method: 'PUT',
        headers: { 'content-range': `bytes */${totalBytes}`, 'content-length': '0' },
      },
      JSON_TIMEOUT_MS,
    )
    if (res.status === 308) return { videoId: null, nextOffset: nextOffsetFromRange(res) }
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { id?: string } | null
      if (body?.id) return { videoId: body.id, nextOffset: totalBytes }
      throw new YoutubeApiError('sessão completa sem id de vídeo', 'retryable')
    }
    throw await classify(res, 'status da sessão de upload')
  }

  async uploadChunk(input: {
    uploadUri: string
    chunk: Uint8Array
    start: number
    totalBytes: number
  }): Promise<UploadChunkResult> {
    const end = input.start + input.chunk.byteLength - 1
    const res = await fetchWithTimeout(
      input.uploadUri,
      {
        method: 'PUT',
        headers: {
          'content-range': `bytes ${input.start}-${end}/${input.totalBytes}`,
          'content-length': String(input.chunk.byteLength),
        },
        body: input.chunk as unknown as RequestInit['body'],
      },
      CHUNK_TIMEOUT_MS,
    )
    if (res.status === 308) return { videoId: null, nextOffset: nextOffsetFromRange(res) }
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { id?: string } | null
      if (body?.id) return { videoId: body.id, nextOffset: input.totalBytes }
      throw new YoutubeApiError('upload completo sem id de vídeo', 'retryable')
    }
    throw await classify(res, 'upload de chunk')
  }

  async setThumbnail(input: {
    accessToken: string
    videoId: string
    bytes: Uint8Array
    contentType: string
  }): Promise<void> {
    const url = new URL(THUMBNAILS_URL)
    url.searchParams.set('videoId', input.videoId)
    const res = await fetchWithTimeout(
      url.toString(),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': input.contentType,
          'content-length': String(input.bytes.byteLength),
        },
        body: input.bytes as unknown as RequestInit['body'],
      },
      JSON_TIMEOUT_MS,
    )
    if (!res.ok) throw await classify(res, 'thumbnails.set')
  }

  async getVideoStatus(
    accessToken: string,
    videoId: string,
  ): Promise<{ privacyStatus: string } | null> {
    const url = new URL(VIDEOS_URL)
    url.searchParams.set('part', 'status')
    url.searchParams.set('id', videoId)
    const res = await fetchWithTimeout(
      url.toString(),
      { headers: { authorization: `Bearer ${accessToken}` } },
      JSON_TIMEOUT_MS,
    )
    if (!res.ok) throw await classify(res, 'videos.list (status)')
    const body = (await res.json()) as { items?: Array<{ status?: { privacyStatus?: string } }> }
    const status = body.items?.[0]?.status?.privacyStatus
    return status ? { privacyStatus: status } : null
  }

  async updateVideoStatus(input: {
    accessToken: string
    videoId: string
    privacyStatus: 'private' | 'public'
    publishAt: string | null
  }): Promise<void> {
    const url = new URL(VIDEOS_URL)
    url.searchParams.set('part', 'status')
    const status: Record<string, unknown> = { privacyStatus: input.privacyStatus }
    // update DELETA propriedade omitida do part — o privacyStatus vai sempre.
    if (input.publishAt) status.publishAt = input.publishAt
    const res = await fetchWithTimeout(
      url.toString(),
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ id: input.videoId, status }),
      },
      JSON_TIMEOUT_MS,
    )
    if (!res.ok) throw await classify(res, 'videos.update (status)')
  }

  async getChannelStats(accessToken: string): Promise<{
    channelId: string
    subscriberCount: number
    viewCount: number
    videoCount: number
  } | null> {
    const url = new URL(CHANNELS_URL)
    url.searchParams.set('part', 'statistics')
    url.searchParams.set('mine', 'true')
    const res = await fetchWithTimeout(
      url.toString(),
      { headers: { authorization: `Bearer ${accessToken}` } },
      JSON_TIMEOUT_MS,
    )
    if (!res.ok) throw await classify(res, 'channels.list (statistics)')
    const body = (await res.json()) as {
      items?: Array<{
        id?: string
        statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string }
      }>
    }
    const channel = body.items?.[0]
    if (!channel?.id) return null
    return {
      channelId: channel.id,
      subscriberCount: Number(channel.statistics?.subscriberCount ?? 0),
      viewCount: Number(channel.statistics?.viewCount ?? 0),
      videoCount: Number(channel.statistics?.videoCount ?? 0),
    }
  }

  async getVideoStats(
    accessToken: string,
    videoIds: string[],
  ): Promise<Map<string, { views: number; likes: number; comments: number }>> {
    const map = new Map<string, { views: number; likes: number; comments: number }>()
    if (videoIds.length === 0) return map
    const url = new URL(VIDEOS_URL)
    url.searchParams.set('part', 'statistics')
    url.searchParams.set('id', videoIds.slice(0, 50).join(','))
    const res = await fetchWithTimeout(
      url.toString(),
      { headers: { authorization: `Bearer ${accessToken}` } },
      JSON_TIMEOUT_MS,
    )
    if (!res.ok) throw await classify(res, 'videos.list (statistics)')
    const body = (await res.json()) as {
      items?: Array<{
        id?: string
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
      }>
    }
    for (const item of body.items ?? []) {
      if (!item.id) continue
      map.set(item.id, {
        views: Number(item.statistics?.viewCount ?? 0),
        likes: Number(item.statistics?.likeCount ?? 0),
        comments: Number(item.statistics?.commentCount ?? 0),
      })
    }
    return map
  }
}
