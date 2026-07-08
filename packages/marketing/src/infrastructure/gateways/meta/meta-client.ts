import {
  type IgContainerStatus,
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
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(new DOMException('meta timeout', 'TimeoutError')),
      JSON_TIMEOUT_MS,
    )
    let res: Response
    try {
      res = await fetch(url.toString(), { method: input.method, body, signal: controller.signal })
    } catch (error) {
      throw new MetaApiError(`${input.context}: falha de rede ao falar com a Meta`, 'retryable', {
        cause: error,
      })
    } finally {
      clearTimeout(timer)
    }
    const json = (await res.json().catch(() => ({}))) as T & GraphErrorBody
    if (!res.ok || json.error) throw classifyGraphError(res.status, json, input.context)
    return json
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
}
