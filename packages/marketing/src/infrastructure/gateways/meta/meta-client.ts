import {
  type FbPostStats,
  type FbReelPublishing,
  type IgContainerStatus,
  type IgMediaStats,
  type MetaApi,
  MetaApiError,
  type MetaApiErrorKind,
} from './meta-api.port'

/**
 * Cliente da Meta Graph API com fetch nativo (o download da mídia é da PRÓPRIA
 * Meta, via URL presigned do R2 — nenhum byte passa por aqui, só JSON pequeno).
 */
const JSON_TIMEOUT_MS = 30_000

/** Códigos de rate limit da Graph API (app/user/page + limite de publicação). */
const RATE_CODES = new Set([4, 17, 32, 613])

interface GraphErrorBody {
  error?: {
    message?: string
    code?: number
    error_subcode?: number
    is_transient?: boolean
  }
}

function classifyGraphError(status: number, body: GraphErrorBody, context: string): MetaApiError {
  const err = body.error
  const code = err?.code ?? 0
  const message = `${context}: ${err?.message ?? `HTTP ${status}`} (code ${code})`
  let kind: MetaApiErrorKind = 'permanent'
  if (code === 190) kind = 'token'
  else if (RATE_CODES.has(code)) kind = 'rate'
  else if (err?.is_transient || status >= 500) kind = 'retryable'
  return new MetaApiError(message, kind)
}

export class MetaClient implements MetaApi {
  constructor(private readonly config: { graphVersion: string }) {}

  private graph(path: string): string {
    return `https://graph.facebook.com/${this.config.graphVersion}${path}`
  }

  /** fetch com timeout + classificação de erro Graph (URLs absolutas — rupload). */
  private async request<T>(url: string, init: RequestInit, context: string): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(new DOMException('meta timeout', 'TimeoutError')),
      JSON_TIMEOUT_MS,
    )
    let res: Response
    try {
      res = await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      throw new MetaApiError(`${context}: falha de rede ao falar com a Meta`, 'retryable', {
        cause: error,
      })
    } finally {
      clearTimeout(timer)
    }
    const json = (await res.json().catch(() => ({}))) as T & GraphErrorBody
    if (!res.ok || json.error) throw classifyGraphError(res.status, json, context)
    return json
  }

  private async call<T>(input: {
    method: 'GET' | 'POST'
    path: string
    accessToken: string
    params?: Record<string, string>
    context: string
  }): Promise<T> {
    const url = new URL(this.graph(input.path))
    if (input.method === 'GET') {
      for (const [k, v] of Object.entries(input.params ?? {})) url.searchParams.set(k, v)
      url.searchParams.set('access_token', input.accessToken)
    }
    const body =
      input.method === 'POST'
        ? new URLSearchParams({ ...input.params, access_token: input.accessToken })
        : undefined
    return this.request<T>(url.toString(), { method: input.method, body }, input.context)
  }

  async createIgContainer(input: {
    accessToken: string
    igUserId: string
    params: Record<string, string>
  }): Promise<string> {
    const body = await this.call<{ id?: string }>({
      method: 'POST',
      path: `/${input.igUserId}/media`,
      accessToken: input.accessToken,
      params: input.params,
      context: 'ig media (container)',
    })
    if (!body.id) throw new MetaApiError('container criado sem id', 'retryable')
    return body.id
  }

  async getIgContainerStatus(input: {
    accessToken: string
    containerId: string
  }): Promise<IgContainerStatus> {
    const body = await this.call<{ status_code?: string }>({
      method: 'GET',
      path: `/${input.containerId}`,
      accessToken: input.accessToken,
      params: { fields: 'status_code' },
      context: 'ig container (status)',
    })
    const status = body.status_code
    if (
      status === 'IN_PROGRESS' ||
      status === 'FINISHED' ||
      status === 'ERROR' ||
      status === 'EXPIRED' ||
      status === 'PUBLISHED'
    ) {
      return status
    }
    throw new MetaApiError(`status de container desconhecido: ${status}`, 'retryable')
  }

  async publishIgContainer(input: {
    accessToken: string
    igUserId: string
    creationId: string
  }): Promise<string> {
    const body = await this.call<{ id?: string }>({
      method: 'POST',
      path: `/${input.igUserId}/media_publish`,
      accessToken: input.accessToken,
      params: { creation_id: input.creationId },
      context: 'ig media_publish',
    })
    if (!body.id) throw new MetaApiError('publish sem media id', 'retryable')
    return body.id
  }

  async getIgMediaPermalink(input: {
    accessToken: string
    mediaId: string
  }): Promise<string | null> {
    try {
      const body = await this.call<{ permalink?: string }>({
        method: 'GET',
        path: `/${input.mediaId}`,
        accessToken: input.accessToken,
        params: { fields: 'permalink' },
        context: 'ig media (permalink)',
      })
      return body.permalink ?? null
    } catch {
      // Permalink é cosmético (externalUrl) — falha aqui nunca derruba o post.
      return null
    }
  }

  async createFbPhotoPost(input: {
    accessToken: string
    pageId: string
    imageUrl: string
    caption: string
  }): Promise<string> {
    const body = await this.call<{ id?: string; post_id?: string }>({
      method: 'POST',
      path: `/${input.pageId}/photos`,
      accessToken: input.accessToken,
      params: { url: input.imageUrl, caption: input.caption },
      context: 'fb photos',
    })
    const postId = body.post_id ?? body.id
    if (!postId) throw new MetaApiError('foto criada sem id de post', 'retryable')
    return postId
  }

  async createFbVideoPost(input: {
    accessToken: string
    pageId: string
    fileUrl: string
    description: string
  }): Promise<string> {
    const body = await this.call<{ id?: string }>({
      method: 'POST',
      path: `/${input.pageId}/videos`,
      accessToken: input.accessToken,
      params: { file_url: input.fileUrl, description: input.description },
      context: 'fb videos',
    })
    if (!body.id) throw new MetaApiError('vídeo criado sem id', 'retryable')
    return body.id
  }

  async startFbReelUpload(input: {
    accessToken: string
    pageId: string
  }): Promise<{ videoId: string; uploadUrl: string }> {
    const body = await this.call<{ video_id?: string; upload_url?: string }>({
      method: 'POST',
      path: `/${input.pageId}/video_reels`,
      accessToken: input.accessToken,
      params: { upload_phase: 'start' },
      context: 'fb video_reels (start)',
    })
    if (!body.video_id || !body.upload_url) {
      throw new MetaApiError('start do reel sem video_id/upload_url', 'retryable')
    }
    return { videoId: body.video_id, uploadUrl: body.upload_url }
  }

  async uploadFbReelByUrl(input: {
    accessToken: string
    uploadUrl: string
    fileUrl: string
  }): Promise<void> {
    // rupload: POST vazio; a Meta baixa o vídeo do `file_url` (URL presigned).
    const body = await this.request<{ success?: boolean }>(
      input.uploadUrl,
      {
        method: 'POST',
        headers: { authorization: `OAuth ${input.accessToken}`, file_url: input.fileUrl },
      },
      'fb reel (upload por file_url)',
    )
    if (body.success !== true) {
      throw new MetaApiError('upload do reel sem success=true', 'retryable')
    }
  }

  async finishFbReel(input: {
    accessToken: string
    pageId: string
    videoId: string
    description: string
  }): Promise<void> {
    await this.call({
      method: 'POST',
      path: `/${input.pageId}/video_reels`,
      accessToken: input.accessToken,
      params: {
        upload_phase: 'finish',
        video_id: input.videoId,
        video_state: 'PUBLISHED',
        description: input.description,
      },
      context: 'fb video_reels (finish)',
    })
  }

  async getFbReelStatus(input: {
    accessToken: string
    videoId: string
  }): Promise<FbReelPublishing> {
    const body = await this.call<{
      status?: { video_status?: string; publishing_phase?: { status?: string } }
    }>({
      method: 'GET',
      path: `/${input.videoId}`,
      accessToken: input.accessToken,
      params: { fields: 'status' },
      context: 'fb reel (status)',
    })
    if (body.status?.video_status === 'error') return 'error'
    const publishing = body.status?.publishing_phase?.status
    if (publishing === 'complete') return 'complete'
    if (publishing === 'in_progress') return 'in_progress'
    return 'not_started'
  }

  // ── Métricas ────────────────────────────────────────────────────────────────

  async getIgAccountStats(input: {
    accessToken: string
    igUserId: string
  }): Promise<{ followers: number; raw: Record<string, unknown> }> {
    const body = await this.call<{ followers_count?: number; media_count?: number }>({
      method: 'GET',
      path: `/${input.igUserId}`,
      accessToken: input.accessToken,
      params: { fields: 'followers_count,media_count' },
      context: 'ig conta (stats)',
    })
    return { followers: Number(body.followers_count ?? 0), raw: { ...body } }
  }

  async getIgMediaStats(input: {
    accessToken: string
    mediaIds: string[]
  }): Promise<Map<string, IgMediaStats>> {
    const map = new Map<string, IgMediaStats>()
    if (input.mediaIds.length === 0) return map
    // Lote `?ids=` (até 50): fields + insights VIVOS numa única chamada.
    for (let i = 0; i < input.mediaIds.length; i += 50) {
      const batch = input.mediaIds.slice(i, i + 50)
      const body = await this.call<
        Record<
          string,
          {
            like_count?: number
            comments_count?: number
            insights?: { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> }
          }
        >
      >({
        method: 'GET',
        path: '/',
        accessToken: input.accessToken,
        params: {
          ids: batch.join(','),
          fields:
            'like_count,comments_count,insights.metric(views,reach,saved,shares,total_interactions)',
        },
        context: 'ig media (stats em lote)',
      })
      for (const id of batch) {
        const item = body[id]
        if (!item) continue
        const insights = new Map<string, number>()
        for (const metric of item.insights?.data ?? []) {
          if (metric.name) insights.set(metric.name, Number(metric.values?.[0]?.value ?? 0))
        }
        map.set(id, {
          views: insights.get('views') ?? 0,
          reach: insights.has('reach') ? (insights.get('reach') ?? 0) : null,
          likes: Number(item.like_count ?? 0),
          comments: Number(item.comments_count ?? 0),
          shares: insights.get('shares') ?? 0,
          saves: insights.get('saved') ?? 0,
          raw: { ...item },
        })
      }
    }
    return map
  }

  async getFbPageStats(input: {
    accessToken: string
    pageId: string
  }): Promise<{ followers: number; raw: Record<string, unknown> }> {
    const body = await this.call<{ followers_count?: number }>({
      method: 'GET',
      path: `/${input.pageId}`,
      accessToken: input.accessToken,
      params: { fields: 'followers_count' },
      context: 'fb página (stats)',
    })
    return { followers: Number(body.followers_count ?? 0), raw: { ...body } }
  }

  async getFbPostStats(input: {
    accessToken: string
    postIds: string[]
  }): Promise<Map<string, FbPostStats>> {
    const map = new Map<string, FbPostStats>()
    if (input.postIds.length === 0) return map
    for (let i = 0; i < input.postIds.length; i += 50) {
      const batch = input.postIds.slice(i, i + 50)
      const body = await this.call<
        Record<
          string,
          {
            reactions?: { summary?: { total_count?: number } }
            comments?: { summary?: { total_count?: number } }
            shares?: { count?: number }
          }
        >
      >({
        method: 'GET',
        path: '/',
        accessToken: input.accessToken,
        params: {
          ids: batch.join(','),
          // SÓ fields estáveis (Page Insights por post foi deprecado em 11/2025).
          fields: 'reactions.summary(true),comments.summary(true),shares',
        },
        context: 'fb posts (stats em lote)',
      })
      for (const id of batch) {
        const item = body[id]
        if (!item) continue
        map.set(id, {
          likes: Number(item.reactions?.summary?.total_count ?? 0),
          comments: Number(item.comments?.summary?.total_count ?? 0),
          shares: Number(item.shares?.count ?? 0),
          raw: { ...item },
        })
      }
    }
    return map
  }

  // ── Listagem (link-external) ────────────────────────────────────────────────

  async listIgMedia(input: { accessToken: string; igUserId: string; after?: string }): Promise<{
    items: Array<{ id: string; permalink: string | null }>
    nextCursor: string | null
  }> {
    const params: Record<string, string> = { fields: 'id,permalink', limit: '50' }
    if (input.after) params.after = input.after
    const body = await this.call<{
      data?: Array<{ id?: string; permalink?: string }>
      paging?: { cursors?: { after?: string }; next?: string }
    }>({
      method: 'GET',
      path: `/${input.igUserId}/media`,
      accessToken: input.accessToken,
      params,
      context: 'ig media (listagem)',
    })
    return {
      items: (body.data ?? []).flatMap((m) =>
        m.id ? [{ id: m.id, permalink: m.permalink ?? null }] : [],
      ),
      nextCursor: body.paging?.next ? (body.paging?.cursors?.after ?? null) : null,
    }
  }

  async listFbPosts(input: { accessToken: string; pageId: string; after?: string }): Promise<{
    items: Array<{ id: string; permalinkUrl: string | null }>
    nextCursor: string | null
  }> {
    const params: Record<string, string> = { fields: 'id,permalink_url', limit: '50' }
    if (input.after) params.after = input.after
    const body = await this.call<{
      data?: Array<{ id?: string; permalink_url?: string }>
      paging?: { cursors?: { after?: string }; next?: string }
    }>({
      method: 'GET',
      path: `/${input.pageId}/posts`,
      accessToken: input.accessToken,
      params,
      context: 'fb posts (listagem)',
    })
    return {
      items: (body.data ?? []).flatMap((p) =>
        p.id ? [{ id: p.id, permalinkUrl: p.permalink_url ?? null }] : [],
      ),
      nextCursor: body.paging?.next ? (body.paging?.cursors?.after ?? null) : null,
    }
  }
}
