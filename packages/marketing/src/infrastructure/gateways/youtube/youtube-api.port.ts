/**
 * Superfície da YouTube Data API v3 usada pelo publisher (interface própria p/
 * o FakeYoutubeApi dos testes). Implementação real: `youtube-client.ts`.
 */
export type YoutubeErrorKind =
  /** 401 — token inválido (o worker renova/reautentica). */
  | 'token'
  /** 403 quotaExceeded/uploadLimitExceeded — adia p/ a virada do dia PT. */
  | 'quota'
  /** 400/403 de metadado/permissão — retry não conserta. */
  | 'permanent'
  /** 5xx/rede — backoff. */
  | 'retryable'
  /** 404/410 no uploadUri — sessão de upload expirou (re-iniciar é seguro). */
  | 'session_expired'

export class YoutubeApiError extends Error {
  constructor(
    message: string,
    readonly kind: YoutubeErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'YoutubeApiError'
  }
}

export interface YoutubeVideoMetadata {
  title: string
  description: string
  tags: string[]
  privacyStatus: 'private' | 'public'
  /** RFC3339 — só com privacyStatus 'private' (agendamento nativo). */
  publishAt: string | null
}

export interface UploadChunkResult {
  /** null = 308 (chunk aceito, upload segue); string = 200/201 com o videoId. */
  videoId: string | null
  /** Offset do PRÓXIMO byte esperado (do header Range do 308). */
  nextOffset: number
}

export interface SessionStatus {
  /** Completo: o vídeo já existe (crash entre o último chunk e o save). */
  videoId: string | null
  /** Incompleto: offset do próximo byte a enviar. */
  nextOffset: number
}

export interface YoutubeApi {
  /** POST uploadType=resumable → header Location (uploadUri da sessão). */
  initResumableSession(input: {
    accessToken: string
    metadata: YoutubeVideoMetadata
    totalBytes: number
    contentType: string
  }): Promise<string>
  /** PUT vazio `Content-Range: bytes *\/total` → offset commitado OU o vídeo pronto. */
  checkSessionStatus(uploadUri: string, totalBytes: number): Promise<SessionStatus>
  uploadChunk(input: {
    uploadUri: string
    chunk: Uint8Array
    start: number
    totalBytes: number
  }): Promise<UploadChunkResult>
  /** thumbnails.set (50 units) — exige canal verificado; falha é NÃO-fatal. */
  setThumbnail(input: {
    accessToken: string
    videoId: string
    bytes: Uint8Array
    contentType: string
  }): Promise<void>
  /** videos.list part=status (1 unit) — repoll do publishAt nativo. */
  getVideoStatus(accessToken: string, videoId: string): Promise<{ privacyStatus: string } | null>
  /** videos.update part=status (50 units) — reagendamento pós-upload. */
  updateVideoStatus(input: {
    accessToken: string
    videoId: string
    privacyStatus: 'private' | 'public'
    publishAt: string | null
  }): Promise<void>
  /** channels.list part=statistics&mine=true (1 unit) — snapshot do canal. */
  getChannelStats(accessToken: string): Promise<{
    channelId: string
    subscriberCount: number
    viewCount: number
    videoCount: number
  } | null>
  /** videos.list part=statistics (1 unit p/ até 50 ids) — snapshot dos vídeos. */
  getVideoStats(
    accessToken: string,
    videoIds: string[],
  ): Promise<Map<string, { views: number; likes: number; comments: number }>>
}
