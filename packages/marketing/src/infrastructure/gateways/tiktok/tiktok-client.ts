import {
  type TikTokApi,
  TikTokApiError,
  type TikTokApiErrorKind,
  type TikTokPublishStatus,
} from './tiktok-api.port'

/**
 * Cliente da Content Posting API com fetch nativo. JSON pequeno em toda
 * chamada — só o PUT dos chunks carrega bytes (timeout generoso próprio).
 */
const CREATOR_INFO_URL = 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/'
const VIDEO_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/'
const STATUS_FETCH_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/'

const JSON_TIMEOUT_MS = 15_000
/** Chunk de 16MiB numa rede lenta leva minutos — timeout próprio. */
const CHUNK_TIMEOUT_MS = 10 * 60_000

interface TikTokErrorBody {
  error?: { code?: string; message?: string; log_id?: string }
}

function classifyErrorCode(code: string | undefined, httpStatus: number): TikTokApiErrorKind {
  if (code === 'access_token_invalid' || code === 'scope_not_authorized' || httpStatus === 401) {
    return 'token'
  }
  if (code === 'rate_limit_exceeded' || httpStatus === 429) return 'rate'
  if (code === 'internal' || httpStatus >= 500) return 'retryable'
  return 'permanent'
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  context: string,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('tiktok timeout', 'TimeoutError')),
    timeoutMs,
  )
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    throw new TikTokApiError(`${context}: falha de rede ao falar com o TikTok`, 'retryable', {
      cause: error,
    })
  } finally {
    clearTimeout(timer)
  }
}

export class TikTokClient implements TikTokApi {
  private async call<T>(input: {
    url: string
    accessToken: string
    body: Record<string, unknown>
    context: string
  }): Promise<T> {
    const res = await fetchWithTimeout(
      input.url,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(input.body),
      },
      JSON_TIMEOUT_MS,
      input.context,
    )
    const json = (await res.json().catch(() => ({}))) as T & TikTokErrorBody
    // O TikTok devolve `error.code === 'ok'` no sucesso — checar código E status.
    const code = json.error?.code
    if (!res.ok || (code && code !== 'ok')) {
      throw new TikTokApiError(
        `${input.context}: ${json.error?.message ?? `HTTP ${res.status}`} (${code ?? res.status})`,
        classifyErrorCode(code, res.status),
      )
    }
    return json
  }

  async queryCreatorInfo(accessToken: string): Promise<{
    privacyLevelOptions: string[]
    maxVideoPostDurationSec: number | null
  }> {
    const body = await this.call<{
      data?: { privacy_level_options?: string[]; max_video_post_duration_sec?: number }
    }>({
      url: CREATOR_INFO_URL,
      accessToken,
      body: {},
      context: 'creator_info',
    })
    return {
      privacyLevelOptions: body.data?.privacy_level_options ?? [],
      maxVideoPostDurationSec: body.data?.max_video_post_duration_sec ?? null,
    }
  }

  async initVideoPost(input: {
    accessToken: string
    title: string
    privacyLevel: string
    videoSize: number
    chunkSize: number
    totalChunkCount: number
  }): Promise<{ publishId: string; uploadUrl: string }> {
    const body = await this.call<{ data?: { publish_id?: string; upload_url?: string } }>({
      url: VIDEO_INIT_URL,
      accessToken: input.accessToken,
      body: {
        post_info: { title: input.title, privacy_level: input.privacyLevel },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: input.videoSize,
          chunk_size: input.chunkSize,
          total_chunk_count: input.totalChunkCount,
        },
      },
      context: 'video/init',
    })
    if (!body.data?.publish_id || !body.data.upload_url) {
      throw new TikTokApiError('init sem publish_id/upload_url', 'retryable')
    }
    return { publishId: body.data.publish_id, uploadUrl: body.data.upload_url }
  }

  async uploadChunk(input: {
    uploadUrl: string
    chunk: Uint8Array
    start: number
    totalBytes: number
    contentType: string
  }): Promise<{ complete: boolean }> {
    const end = input.start + input.chunk.byteLength - 1
    const res = await fetchWithTimeout(
      input.uploadUrl,
      {
        method: 'PUT',
        headers: {
          'content-type': input.contentType,
          'content-length': String(input.chunk.byteLength),
          'content-range': `bytes ${input.start}-${end}/${input.totalBytes}`,
        },
        body: input.chunk as unknown as RequestInit['body'],
      },
      CHUNK_TIMEOUT_MS,
      'upload de chunk',
    )
    if (res.status === 206) return { complete: false }
    if (res.status === 201 || res.ok) return { complete: true }
    // 403 = upload_url venceu (1h); 416 = range fora do progresso real —
    // nos dois casos a sessão não serve mais: limpar e recomeçar.
    if (res.status === 403 || res.status === 416) {
      throw new TikTokApiError(
        `upload de chunk: sessão inválida (${res.status})`,
        'session_expired',
      )
    }
    if (res.status >= 500) {
      throw new TikTokApiError(`upload de chunk: ${res.status}`, 'retryable')
    }
    throw new TikTokApiError(`upload de chunk: ${res.status}`, 'permanent')
  }

  async fetchPublishStatus(input: { accessToken: string; publishId: string }): Promise<{
    status: TikTokPublishStatus
    failReason: string | null
    postIds: string[]
    uploadedBytes: number | null
  }> {
    const body = await this.call<{
      data?: {
        status?: string
        fail_reason?: string
        publicaly_available_post_id?: Array<number | string>
        uploaded_bytes?: number
      }
    }>({
      url: STATUS_FETCH_URL,
      accessToken: input.accessToken,
      body: { publish_id: input.publishId },
      context: 'status/fetch',
    })
    const status = body.data?.status
    if (
      status !== 'PROCESSING_UPLOAD' &&
      status !== 'PROCESSING_DOWNLOAD' &&
      status !== 'SEND_TO_USER_INBOX' &&
      status !== 'PUBLISH_COMPLETE' &&
      status !== 'FAILED'
    ) {
      throw new TikTokApiError(`status de publish desconhecido: ${status}`, 'retryable')
    }
    return {
      status,
      failReason: body.data?.fail_reason ?? null,
      postIds: (body.data?.publicaly_available_post_id ?? []).map(String),
      uploadedBytes: body.data?.uploaded_bytes ?? null,
    }
  }
}
