import type { MediaAsset } from '../../../domain/media/media-asset'
import type {
  PublishInput,
  PublishOutcome,
  SocialPublisher,
} from '../../../domain/ports/social-publisher.port'
import type { PublicationFormat } from '../../../domain/publication/publication'
import { type TikTokApi, TikTokApiError } from './tiktok-api.port'

/**
 * Publisher automático do TikTok (tt_video — Content Posting API, Direct Post
 * por FILE_UPLOAD; PULL_FROM_URL exigiria verificar o domínio da URL, o que o
 * presigned do R2 não permite).
 *
 * Não há agendamento nativo E terminar o upload = publicar. Então NADA de
 * side-effect antes da hora: agendado no futuro → `pending` até `scheduledAt`;
 * na hora, creator_info → init → chunks → poll até PUBLISH_COMPLETE.
 *
 * IDEMPOTÊNCIA: publish_id/upload_url/chunkSize no checkpoint ANTES de subir
 * bytes; retry em fase `uploading` consulta status/fetch e RETOMA de
 * `uploaded_bytes` (desalinhado → sessão limpa e recomeça; o publish_id órfão
 * expira sozinho). App sem auditoria só posta SELF_ONLY (privado) — o aviso
 * fica em `provider_session.privacyNote`.
 */
interface TikTokSession {
  provider?: string
  phase?: 'uploading' | 'processing'
  publishId?: string | null
  uploadUrl?: string | null
  chunkSize?: number
  totalBytes?: number
  videoAssetId?: string
  privacyNote?: string
}

const CAPTION_MAX = 2200
const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024
const MIN_CHUNK = 5 * 1024 * 1024
const MAX_CHUNK = 64 * 1024 * 1024
const POLL_MS = 60_000
const RATE_DEFER_MS = 10 * 60_000
const DUE_GRACE_MS = 60_000

/**
 * Plano de chunks da API: <5MB sobe INTEIRO; senão chunk clampado 5..64MB e
 * `total_chunk_count = floor(size/chunk)` — o RESTO é fundido no último chunk
 * (que pode chegar a 2×chunk−1, dentro do teto de 128MB da API).
 */
export function chunkPlan(
  totalBytes: number,
  preferredChunk: number,
): { chunkSize: number; totalChunkCount: number } {
  if (totalBytes < MIN_CHUNK) return { chunkSize: totalBytes, totalChunkCount: 1 }
  const chunkSize = Math.min(Math.max(preferredChunk, MIN_CHUNK), MAX_CHUNK)
  return { chunkSize, totalChunkCount: Math.max(1, Math.floor(totalBytes / chunkSize)) }
}

/** Mensagens pt-BR p/ os fail_reason permanentes mais comuns. */
const FAIL_REASON_MESSAGES: Record<string, string> = {
  file_format_check_failed: 'O TikTok recusou o formato do vídeo. Use MP4 (H.264) e anexe de novo',
  duration_check_failed:
    'O vídeo passa do limite de duração da API do TikTok (10 minutos). Encurte e anexe de novo',
  frame_rate_check_failed: 'O TikTok exige vídeo entre 23 e 60 FPS. Reexporte e anexe de novo',
  picture_size_check_failed:
    'A resolução do vídeo está fora do aceito pelo TikTok (360 a 4096 px). Reexporte',
  auth_removed: 'O acesso do app foi removido no TikTok. Reconecte a conta em Conexões',
  spam_risk_user_banned_from_posting: 'A conta do TikTok está impedida de postar via API',
}

export interface TikTokPublisherDeps {
  api: TikTokApi
  config: {
    /** Chunk preferido do FILE_UPLOAD (clampado 5..64MB pela regra da API). */
    chunkBytes: number
  }
  now: () => Date
}

export class TikTokPublisher implements SocialPublisher {
  readonly network = 'tiktok' as const

  constructor(private readonly deps: TikTokPublisherDeps) {}

  supports(format: PublicationFormat): boolean {
    return format === 'tt_video'
  }

  async publish(input: PublishInput): Promise<PublishOutcome> {
    try {
      return await this.run(input)
    } catch (error) {
      if (error instanceof TikTokApiError) {
        if (error.kind === 'rate') {
          return {
            kind: 'deferred',
            nextAttemptAt: new Date(this.deps.now().getTime() + RATE_DEFER_MS),
            reason: 'Limite de chamadas do TikTok atingido. A publicação foi adiada por 10 minutos',
          }
        }
        if (error.kind === 'token') {
          return {
            kind: 'permanent',
            reason: 'A conta do TikTok precisa ser reconectada em Conexões. Depois reagende',
          }
        }
        if (error.kind === 'session_expired') {
          // upload_url venceu (1h) — recomeça do zero; o publish_id órfão expira.
          await input.saveSession({ publishId: null, uploadUrl: null, phase: undefined })
          return { kind: 'retryable', reason: 'A sessão de upload do TikTok venceu. Recomeçando' }
        }
        if (error.kind === 'permanent') return { kind: 'permanent', reason: error.message }
        return { kind: 'retryable', reason: error.message }
      }
      throw error
    }
  }

  private async run(input: PublishInput): Promise<PublishOutcome> {
    const session = input.session as TikTokSession
    const caption = input.publication.caption
    if (caption.length > CAPTION_MAX) {
      return {
        kind: 'permanent',
        reason: 'Legenda acima do limite do TikTok (2200 caracteres). Encurte no composer',
      }
    }
    const video = pickVideo(input.assets)
    if (!video?.r2Key) {
      return {
        kind: 'permanent',
        reason: 'Nenhum vídeo pronto no conteúdo. Anexe o arquivo final na aba Anexos',
      }
    }
    if (video.sizeBytes > MAX_VIDEO_BYTES) {
      return {
        kind: 'permanent',
        reason: 'O vídeo passa do limite de 4GB da API do TikTok. Comprima e anexe de novo',
      }
    }

    // Sessão em processamento (ou retry pós-crash): o status resolve tudo.
    if (session.publishId && session.phase === 'processing') {
      return this.poll(input, session.publishId)
    }

    const now = this.deps.now()
    let publishId = session.publishId ?? null
    let uploadUrl = session.uploadUrl ?? null
    let chunkSize = session.chunkSize ?? 0
    const totalBytes = session.totalBytes ?? video.sizeBytes
    let offset = 0

    if (publishId && uploadUrl) {
      // Retry no meio do upload: o status diz quantos bytes o TikTok já tem.
      const status = await this.deps.api.fetchPublishStatus({
        accessToken: input.accessToken,
        publishId,
      })
      if (status.status === 'PUBLISH_COMPLETE') return this.finish(input, status.postIds, publishId)
      if (status.status === 'FAILED') return this.mapFailure(input, status.failReason)
      const uploaded = status.uploadedBytes ?? 0
      if (chunkSize <= 0 || uploaded % chunkSize !== 0) {
        // Progresso desalinhado do nosso plano de chunks: recomeçar é o seguro.
        await input.saveSession({ publishId: null, uploadUrl: null, phase: undefined })
        return { kind: 'retryable', reason: 'Upload do TikTok desalinhado. Recomeçando' }
      }
      offset = uploaded
    } else {
      // NADA de side-effect antes da hora: terminar o upload = publicar.
      const scheduledAt = input.publication.scheduledAt
      if (scheduledAt && scheduledAt.getTime() > now.getTime() + DUE_GRACE_MS) {
        return { kind: 'pending', repollAt: scheduledAt }
      }
      const creator = await this.deps.api.queryCreatorInfo(input.accessToken)
      const privacy = creator.privacyLevelOptions.includes('PUBLIC_TO_EVERYONE')
        ? 'PUBLIC_TO_EVERYONE'
        : (creator.privacyLevelOptions[0] ?? 'SELF_ONLY')
      const privacyNote =
        privacy === 'PUBLIC_TO_EVERYONE'
          ? undefined
          : 'App sem auditoria do TikTok: o post subiu PRIVADO (SELF_ONLY). Torne-o público no app do TikTok, ou peça a auditoria'
      const plan = chunkPlan(video.sizeBytes, this.deps.config.chunkBytes)
      chunkSize = plan.chunkSize
      const init = await this.deps.api.initVideoPost({
        accessToken: input.accessToken,
        title: caption,
        privacyLevel: privacy,
        videoSize: video.sizeBytes,
        chunkSize: plan.chunkSize,
        totalChunkCount: plan.totalChunkCount,
      })
      publishId = init.publishId
      uploadUrl = init.uploadUrl
      // Checkpoint ANTES de subir 1 byte: retry consulta o status e retoma.
      await input.saveSession({
        provider: 'tiktok',
        phase: 'uploading',
        publishId,
        uploadUrl,
        chunkSize,
        totalBytes: video.sizeBytes,
        videoAssetId: video.id,
        ...(privacyNote ? { privacyNote } : {}),
      })
    }

    // Upload em chunks: todos de `chunkSize`, o ÚLTIMO leva o resto.
    const totalChunkCount = Math.max(1, Math.floor(totalBytes / chunkSize))
    let complete = false
    let index = Math.floor(offset / chunkSize)
    while (!complete && index < totalChunkCount) {
      const start = index * chunkSize
      const end = index === totalChunkCount - 1 ? totalBytes - 1 : start + chunkSize - 1
      const chunk = await input.assetBytes(video, start, end)
      const result = await this.deps.api.uploadChunk({
        uploadUrl,
        chunk,
        start,
        totalBytes,
        contentType: video.contentType,
      })
      complete = result.complete
      index += 1
    }
    if (!complete) {
      return { kind: 'retryable', reason: 'Upload terminou sem confirmação do TikTok. Retomando' }
    }
    await input.saveSession({ phase: 'processing' })
    return this.poll(input, publishId)
  }

  /** Pós-upload: o TikTok processa e publica sozinho — só consultar. */
  private async poll(input: PublishInput, publishId: string): Promise<PublishOutcome> {
    const status = await this.deps.api.fetchPublishStatus({
      accessToken: input.accessToken,
      publishId,
    })
    if (status.status === 'PUBLISH_COMPLETE') return this.finish(input, status.postIds, publishId)
    if (status.status === 'FAILED') return this.mapFailure(input, status.failReason)
    return { kind: 'pending', repollAt: new Date(this.deps.now().getTime() + POLL_MS) }
  }

  private finish(input: PublishInput, postIds: string[], publishId: string): PublishOutcome {
    const postId = postIds[0] ?? null
    const metadata = input.account.metadata as { username?: unknown }
    const username =
      input.account.username ?? (typeof metadata.username === 'string' ? metadata.username : null)
    return {
      kind: 'published',
      externalPostId: postId ?? publishId,
      externalUrl:
        postId && username ? `https://www.tiktok.com/@${username}/video/${postId}` : null,
    }
  }

  private async mapFailure(
    input: PublishInput,
    failReason: string | null,
  ): Promise<PublishOutcome> {
    // publish_id FAILED está morto — limpa p/ o retry (quando houver) re-iniciar.
    await input.saveSession({ publishId: null, uploadUrl: null, phase: undefined })
    if (failReason === 'internal') {
      return { kind: 'retryable', reason: 'Erro interno do TikTok. Tentando de novo' }
    }
    if (failReason === 'spam_risk_too_many_posts') {
      return {
        kind: 'deferred',
        nextAttemptAt: new Date(this.deps.now().getTime() + 60 * 60_000),
        reason: 'O TikTok limitou a frequência de posts da conta. Adiada por 1 hora',
      }
    }
    return {
      kind: 'permanent',
      reason:
        FAIL_REASON_MESSAGES[failReason ?? ''] ??
        `O TikTok recusou a publicação (${failReason ?? 'sem motivo informado'})`,
    }
  }
}

function pickVideo(assets: MediaAsset[]): MediaAsset | null {
  const videos = assets.filter(
    (a) =>
      a.status === 'ready' &&
      a.r2Key &&
      (a.contentType === 'video/mp4' ||
        a.contentType === 'video/quicktime' ||
        a.contentType === 'video/webm'),
  )
  return videos.find((a) => a.kind === 'final') ?? videos[0] ?? null
}
