/**
 * Porta fina sobre a TikTok Content Posting API (Direct Post). Espelha os
 * ports do youtube/meta: o publisher fala com esta interface e os testes usam
 * o FakeTikTokApi — o client real (fetch nativo) fica atrás.
 */

export type TikTokApiErrorKind =
  /** Token inválido/revogado — reconectar em Conexões. */
  | 'token'
  /** Rate limit (init 6/min, status 30/min) — adia e volta. */
  | 'rate'
  /** upload_url venceu (TTL 1h) — limpa a sessão e recomeça. */
  | 'session_expired'
  | 'permanent'
  | 'retryable'

export class TikTokApiError extends Error {
  constructor(
    message: string,
    readonly kind: TikTokApiErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'TikTokApiError'
  }
}

export type TikTokPublishStatus =
  | 'PROCESSING_UPLOAD'
  | 'PROCESSING_DOWNLOAD'
  | 'SEND_TO_USER_INBOX'
  | 'PUBLISH_COMPLETE'
  | 'FAILED'

export interface TikTokApi {
  /** OBRIGATÓRIO antes de postar: devolve as opções de privacidade do criador. */
  queryCreatorInfo(accessToken: string): Promise<{
    privacyLevelOptions: string[]
    maxVideoPostDurationSec: number | null
  }>
  /** POST /v2/post/publish/video/init/ (FILE_UPLOAD) → sessão de upload (1h). */
  initVideoPost(input: {
    accessToken: string
    title: string
    privacyLevel: string
    videoSize: number
    chunkSize: number
    totalChunkCount: number
  }): Promise<{ publishId: string; uploadUrl: string }>
  /** PUT do chunk — 206 = parcial (complete false), 201 = tudo recebido. */
  uploadChunk(input: {
    uploadUrl: string
    chunk: Uint8Array
    start: number
    totalBytes: number
    contentType: string
  }): Promise<{ complete: boolean }>
  /** POST /v2/post/publish/status/fetch/ — consultável (retry nunca ambíguo). */
  fetchPublishStatus(input: { accessToken: string; publishId: string }): Promise<{
    status: TikTokPublishStatus
    failReason: string | null
    postIds: string[]
    uploadedBytes: number | null
  }>
}
