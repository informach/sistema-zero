/**
 * Porta fina sobre a Meta Graph API (publicação IG/FB). Espelha o
 * youtube-api.port: o publisher fala com esta interface e os testes usam o
 * FakeMetaApi — o client real (fetch nativo) fica atrás.
 */

export type MetaApiErrorKind =
  /** Token inválido/revogado (code 190) — reconectar em Conexões. */
  | 'token'
  /** Limite de chamadas/publicações (codes 4/17/32/613 e o teto de 100 posts/24h). */
  | 'rate'
  | 'permanent'
  | 'retryable'

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly kind: MetaApiErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'MetaApiError'
  }
}

/** `status_code` de um container de mídia do IG (containers valem 24h). */
export type IgContainerStatus = 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED'

/** Fase de publicação de um Reel do FB (`status.publishing_phase.status`). */
export type FbReelPublishing = 'not_started' | 'in_progress' | 'complete' | 'error'

export interface MetaApi {
  // ── Instagram (Content Publishing: container → poll → publish) ─────────────
  /** POST /{ig}/media — devolve o creation_id do container. */
  createIgContainer(input: {
    accessToken: string
    igUserId: string
    /** image_url|video_url|media_type|caption|is_carousel_item|children… */
    params: Record<string, string>
  }): Promise<string>
  getIgContainerStatus(input: {
    accessToken: string
    containerId: string
  }): Promise<IgContainerStatus>
  /** POST /{ig}/media_publish — devolve o media_id do post no ar. */
  publishIgContainer(input: {
    accessToken: string
    igUserId: string
    creationId: string
  }): Promise<string>
  /** Permalink do post (best-effort — null se o campo não vier). */
  getIgMediaPermalink(input: { accessToken: string; mediaId: string }): Promise<string | null>

  // ── Facebook (Página) ───────────────────────────────────────────────────────
  /** POST /{page}/photos {url} — devolve o id do POST no feed (post_id). */
  createFbPhotoPost(input: {
    accessToken: string
    pageId: string
    imageUrl: string
    caption: string
  }): Promise<string>
  /** POST /{page}/videos {file_url} — devolve o id do vídeo (o download é assíncrono). */
  createFbVideoPost(input: {
    accessToken: string
    pageId: string
    fileUrl: string
    description: string
  }): Promise<string>

  // ── Facebook Reels (start → upload por file_url → finish → poll) ───────────
  /** POST /{page}/video_reels {upload_phase: start} → sessão de upload. */
  startFbReelUpload(input: {
    accessToken: string
    pageId: string
  }): Promise<{ videoId: string; uploadUrl: string }>
  /** POST no rupload com header `file_url` (a Meta baixa o vídeo — sem bytes aqui). */
  uploadFbReelByUrl(input: {
    accessToken: string
    uploadUrl: string
    fileUrl: string
  }): Promise<void>
  /** POST {upload_phase: finish, video_state: PUBLISHED} — publica o reel. */
  finishFbReel(input: {
    accessToken: string
    pageId: string
    videoId: string
    description: string
  }): Promise<void>
  /** GET /{videoId}?fields=status — fase de publicação (consultável = retry seguro). */
  getFbReelStatus(input: { accessToken: string; videoId: string }): Promise<FbReelPublishing>

  // ── Métricas (só fields/insights VIVOS — deprecação massiva de 11/2025) ────
  /** GET /{ig}?fields=followers_count,media_count. */
  getIgAccountStats(input: {
    accessToken: string
    igUserId: string
  }): Promise<{ followers: number; raw: Record<string, unknown> }>
  /** Lote `?ids=` com fields + insights vivos (views/reach/saved/shares/total_interactions). */
  getIgMediaStats(input: {
    accessToken: string
    mediaIds: string[]
  }): Promise<Map<string, IgMediaStats>>
  /** GET /{page}?fields=followers_count. */
  getFbPageStats(input: {
    accessToken: string
    pageId: string
  }): Promise<{ followers: number; raw: Record<string, unknown> }>
  /** Lote `?ids=` com os fields ESTÁVEIS (reactions/comments summary + shares). */
  getFbPostStats(input: {
    accessToken: string
    postIds: string[]
  }): Promise<Map<string, FbPostStats>>

  // ── Listagem p/ o vínculo manual↔post real (link-external) ─────────────────
  /** GET /{ig}/media?fields=id,permalink (paginado). */
  listIgMedia(input: {
    accessToken: string
    igUserId: string
    after?: string
  }): Promise<{ items: Array<{ id: string; permalink: string | null }>; nextCursor: string | null }>
  /** GET /{page}/posts?fields=id,permalink_url (paginado). */
  listFbPosts(input: { accessToken: string; pageId: string; after?: string }): Promise<{
    items: Array<{ id: string; permalinkUrl: string | null }>
    nextCursor: string | null
  }>
}

export interface IgMediaStats {
  views: number
  reach: number | null
  likes: number
  comments: number
  shares: number
  saves: number
  raw: Record<string, unknown>
}

export interface FbPostStats {
  likes: number
  comments: number
  shares: number
  raw: Record<string, unknown>
}
