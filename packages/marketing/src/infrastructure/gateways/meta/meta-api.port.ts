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
}
