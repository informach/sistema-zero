import type { YtQuotaGuard } from '../../../application/publications/yt-quota-guard'
import { nextQuotaResetPt } from '../../../application/publications/yt-quota-guard'
import type { MediaAsset } from '../../../domain/media/media-asset'
import type {
  PublishInput,
  PublishOutcome,
  SocialPublisher,
} from '../../../domain/ports/social-publisher.port'
import type { PublicationFormat } from '../../../domain/publication/publication'
import { type YoutubeApi, YoutubeApiError } from './youtube-api.port'

/**
 * Publisher automático do YouTube (yt_video/yt_short — Short é AUTOMÁTICO:
 * vídeo vertical/quadrado ≤3min, sem flag na API).
 *
 * IDEMPOTÊNCIA (invariante nº 1): todo side-effect tem checkpoint no
 * `provider_session` persistido ANTES/DEPOIS — com `uploadUri` salvo o retry
 * SEMPRE consulta a sessão (`bytes *\/total`) e retoma/recupera o videoId; um
 * `videos.insert` NUNCA é recriado com sessão viva. Agendamento é NATIVO
 * (`status.publishAt` + private): o upload sobe ANTECIPADO (lead) e o YouTube
 * publica sozinho — o worker só repolla (`pending`, sem gastar tentativa).
 */
interface YtSession {
  provider?: string
  phase?: 'uploading' | 'awaiting_native_publish' | 'resync_publish_at'
  uploadUri?: string | null
  totalBytes?: number
  videoAssetId?: string
  videoId?: string
  publishAt?: string | null
  thumbnailDone?: boolean
  thumbnailError?: string
}

const TITLE_MAX = 100
/** Descrição é limitada em BYTES (5000), não caracteres — importa em PT. */
const DESCRIPTION_MAX_BYTES = 5000
/** Tags: 500 caracteres no TOTAL contando as vírgulas separadoras. */
const TAGS_MAX_CHARS = 500
const THUMB_MAX_BYTES = 2 * 1024 * 1024
const REPOLL_MIN_MS = 5 * 60_000
const QUOTA_JITTER_MS = 5 * 60_000

const encoder = new TextEncoder()

function fitTags(tags: string[]): string[] {
  const kept: string[] = []
  let total = 0
  for (const tag of tags) {
    const cost = tag.length + (kept.length > 0 ? 1 : 0)
    if (total + cost > TAGS_MAX_CHARS) break
    kept.push(tag)
    total += cost
  }
  return kept
}

export function youtubeExternalUrl(format: PublicationFormat, videoId: string): string {
  return format === 'yt_short'
    ? `https://youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`
}

export interface YoutubePublisherDeps {
  api: YoutubeApi
  quota: YtQuotaGuard
  config: {
    chunkBytes: number
    /** Custo do videos.insert (1600 legado / 1 no modelo novo — env). */
    insertUnits: number
  }
  now: () => Date
}

export class YoutubePublisher implements SocialPublisher {
  readonly network = 'youtube' as const

  constructor(private readonly deps: YoutubePublisherDeps) {}

  supports(format: PublicationFormat): boolean {
    return format === 'yt_video' || format === 'yt_short'
  }

  async publish(input: PublishInput): Promise<PublishOutcome> {
    try {
      return await this.run(input)
    } catch (error) {
      if (error instanceof YoutubeApiError) {
        if (error.kind === 'quota') {
          return {
            kind: 'deferred',
            nextAttemptAt: nextQuotaResetPt(this.deps.now(), QUOTA_JITTER_MS),
            reason:
              'Quota diária do YouTube esgotada. A publicação foi adiada para depois da virada (meia-noite PT).',
          }
        }
        if (error.kind === 'permanent') return { kind: 'permanent', reason: error.message }
        // token/retryable/session_expired não tratados no fluxo → backoff.
        return { kind: 'retryable', reason: error.message }
      }
      throw error
    }
  }

  private async run(input: PublishInput): Promise<PublishOutcome> {
    const session = input.session as YtSession
    const now = this.deps.now()

    // Vídeo JÁ existe no YouTube: só resync de horário ou repoll do publishAt.
    if (session.videoId) {
      if (session.phase === 'resync_publish_at') return this.resyncPublishAt(input, session)
      return this.pollNativePublish(input, session)
    }

    // ── Validação de metadados (as regras da API, ANTES de gastar quota) ──────
    const title = (input.publication.title ?? '').trim()
    if (!title) {
      return { kind: 'permanent', reason: 'Defina o título do vídeo no composer' }
    }
    if (title.length > TITLE_MAX || /[<>]/.test(title)) {
      return {
        kind: 'permanent',
        reason: 'Título inválido para o YouTube (máximo 100 caracteres, sem < ou >)',
      }
    }
    if (encoder.encode(input.publication.caption).length > DESCRIPTION_MAX_BYTES) {
      return {
        kind: 'permanent',
        reason: 'Descrição acima do limite do YouTube (5000 bytes). Encurte no composer',
      }
    }
    const video = this.pickVideoAsset(input.assets)
    if (!video?.r2Key) {
      return {
        kind: 'permanent',
        reason: 'Nenhum vídeo pronto no conteúdo. Anexe o arquivo final na aba Anexos',
      }
    }

    // Agendado no futuro → sobe PRIVADO com publishAt nativo; vencido → público já.
    const scheduledAt = input.publication.scheduledAt
    const publishAt =
      scheduledAt && scheduledAt.getTime() > now.getTime() + 60_000
        ? scheduledAt.toISOString()
        : null

    let uploadUri = session.uploadUri ?? null
    const totalBytes = session.totalBytes ?? video.sizeBytes

    if (!uploadUri) {
      // Reserva de quota SÓ na criação da sessão (o retry com uploadUri salvo
      // não paga de novo).
      const reserved = await this.deps.quota.tryReserve({
        units: this.deps.config.insertUnits,
        isUpload: true,
      })
      if (!reserved) {
        return {
          kind: 'deferred',
          nextAttemptAt: nextQuotaResetPt(now, QUOTA_JITTER_MS),
          reason:
            'Quota diária do YouTube esgotada. A publicação foi adiada para depois da virada (meia-noite PT).',
        }
      }
      uploadUri = await this.deps.api.initResumableSession({
        accessToken: input.accessToken,
        metadata: {
          title,
          description: input.publication.caption,
          tags: fitTags(input.publication.tags),
          privacyStatus: publishAt ? 'private' : 'public',
          publishAt,
        },
        totalBytes: video.sizeBytes,
        contentType: video.contentType,
      })
      // Checkpoint ANTES de subir 1 byte: crash daqui em diante retoma a sessão.
      await input.saveSession({
        provider: 'youtube',
        phase: 'uploading',
        uploadUri,
        totalBytes: video.sizeBytes,
        videoAssetId: video.id,
        publishAt,
      })
    }

    // ── Retomada idempotente: SEMPRE consulta a sessão antes de subir bytes ───
    let offset: number
    let videoId: string | null = null
    try {
      const status = await this.deps.api.checkSessionStatus(uploadUri, totalBytes)
      videoId = status.videoId
      offset = status.nextOffset
    } catch (error) {
      if (error instanceof YoutubeApiError && error.kind === 'session_expired') {
        // Sessão morreu SEM vídeo: limpar o checkpoint e reiniciar é seguro
        // (vídeo só nasce no último chunk).
        await input.saveSession({ uploadUri: null, totalBytes: null })
        return { kind: 'retryable', reason: 'Sessão de upload expirou. Recomeça no próximo ciclo' }
      }
      throw error
    }

    while (videoId === null && offset < totalBytes) {
      const end = Math.min(offset + this.deps.config.chunkBytes, totalBytes) - 1
      const chunk = await input.assetBytes(video, offset, end)
      const result = await this.deps.api.uploadChunk({
        uploadUri,
        chunk,
        start: offset,
        totalBytes,
      })
      videoId = result.videoId
      offset = result.nextOffset
    }
    if (videoId === null) {
      return { kind: 'retryable', reason: 'Upload terminou sem id de vídeo. Retomando' }
    }

    // Checkpoint IMEDIATO pós-insert: o id nunca se perde.
    await input.saveSession({
      videoId,
      phase: publishAt ? 'awaiting_native_publish' : undefined,
    })

    await this.trySetThumbnail(input, videoId)

    if (!publishAt) {
      return {
        kind: 'published',
        externalPostId: videoId,
        externalUrl: youtubeExternalUrl(input.publication.format, videoId),
      }
    }
    const repollAt = new Date(
      Math.max(new Date(publishAt).getTime(), now.getTime() + REPOLL_MIN_MS),
    )
    return { kind: 'pending', repollAt }
  }

  /** Repoll do agendamento NATIVO: private → ainda esperando; public → no ar. */
  private async pollNativePublish(
    input: PublishInput,
    session: YtSession,
  ): Promise<PublishOutcome> {
    const now = this.deps.now()
    const videoId = session.videoId as string
    const publishAtMs = session.publishAt ? new Date(session.publishAt).getTime() : 0
    if (publishAtMs > now.getTime()) {
      return { kind: 'pending', repollAt: new Date(publishAtMs) }
    }
    const reserved = await this.deps.quota.tryReserve({ units: 1, isUpload: false })
    if (!reserved) {
      return {
        kind: 'deferred',
        nextAttemptAt: nextQuotaResetPt(now, QUOTA_JITTER_MS),
        reason: 'Quota diária do YouTube esgotada durante a checagem. Adiada para a virada',
      }
    }
    const status = await this.deps.api.getVideoStatus(input.accessToken, videoId)
    if (!status) {
      return {
        kind: 'permanent',
        reason: 'O vídeo não existe mais no YouTube (apagado no Studio?)',
      }
    }
    if (status.privacyStatus === 'public') {
      return {
        kind: 'published',
        externalPostId: videoId,
        externalUrl: youtubeExternalUrl(input.publication.format, videoId),
      }
    }
    // Ainda private (processamento/clock skew) → repoll SEM gastar tentativa.
    return { kind: 'pending', repollAt: new Date(now.getTime() + REPOLL_MIN_MS) }
  }

  /** Reagendamento PÓS-upload: videos.update sincroniza o publishAt nativo. */
  private async resyncPublishAt(input: PublishInput, session: YtSession): Promise<PublishOutcome> {
    const now = this.deps.now()
    const videoId = session.videoId as string
    const scheduledAt = input.publication.scheduledAt
    const reserved = await this.deps.quota.tryReserve({ units: 50, isUpload: false })
    if (!reserved) {
      return {
        kind: 'deferred',
        nextAttemptAt: nextQuotaResetPt(now, QUOTA_JITTER_MS),
        reason: 'Quota diária do YouTube esgotada no reagendamento. Adiada para a virada',
      }
    }
    const future = scheduledAt && scheduledAt.getTime() > now.getTime() + 60_000
    await this.deps.api.updateVideoStatus({
      accessToken: input.accessToken,
      videoId,
      // update deleta propriedade omitida — o privacyStatus vai SEMPRE.
      privacyStatus: future ? 'private' : 'public',
      publishAt: future ? (scheduledAt?.toISOString() ?? null) : null,
    })
    if (!future) {
      await input.saveSession({ phase: undefined, publishAt: null })
      return {
        kind: 'published',
        externalPostId: videoId,
        externalUrl: youtubeExternalUrl(input.publication.format, videoId),
      }
    }
    const publishAt = scheduledAt?.toISOString() ?? null
    await input.saveSession({ phase: 'awaiting_native_publish', publishAt })
    return {
      kind: 'pending',
      repollAt: new Date(Math.max(scheduledAt?.getTime() ?? 0, now.getTime() + REPOLL_MIN_MS)),
    }
  }

  /** Thumbnail é best-effort: canal sem verificação por telefone → 403 NÃO-fatal. */
  private async trySetThumbnail(input: PublishInput, videoId: string): Promise<void> {
    const session = input.session as YtSession
    if (session.thumbnailDone) return
    const coverId = input.publication.coverAssetId
    if (!coverId) return
    const cover = input.assets.find(
      (a) =>
        a.id === coverId &&
        a.status === 'ready' &&
        a.r2Key &&
        a.contentType.startsWith('image/') &&
        a.sizeBytes <= THUMB_MAX_BYTES,
    )
    if (!cover) return
    try {
      const reserved = await this.deps.quota.tryReserve({ units: 50, isUpload: false })
      if (!reserved) return
      const bytes = await input.assetBytes(cover, 0, cover.sizeBytes - 1)
      await this.deps.api.setThumbnail({
        accessToken: input.accessToken,
        videoId,
        bytes,
        contentType: cover.contentType,
      })
      await input.saveSession({ thumbnailDone: true })
    } catch (error) {
      await input.saveSession({
        thumbnailError: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private pickVideoAsset(assets: MediaAsset[]): MediaAsset | null {
    const videos = assets.filter(
      (a) => a.status === 'ready' && a.r2Key && a.contentType.startsWith('video/'),
    )
    return videos.find((a) => a.kind === 'final') ?? videos[0] ?? null
  }
}
