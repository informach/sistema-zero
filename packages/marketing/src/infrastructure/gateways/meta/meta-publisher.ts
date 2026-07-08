import type { MediaAsset } from '../../../domain/media/media-asset'
import type {
  PublishInput,
  PublishOutcome,
  SocialPublisher,
} from '../../../domain/ports/social-publisher.port'
import type { PublicationFormat } from '../../../domain/publication/publication'
import { type MetaApi, MetaApiError } from './meta-api.port'

/**
 * Publisher automático da Meta — UMA classe, DUAS instâncias (instagram e
 * facebook), compartilhando o MetaApi (o page token serve os dois).
 *
 * Instagram publica por CONTAINER (POST /media → poll status → media_publish);
 * a Meta baixa a mídia por URL presigned do R2 (nenhum byte passa por aqui).
 * Não há agendamento nativo: o worker claima no LEAD (~10min), o container
 * processa durante a espera e o publish sai NA HORA agendada (`pending` segura
 * sem gastar tentativa). Facebook posta direto (photos/videos) na hora.
 *
 * IDEMPOTÊNCIA: containerId/publishedMediaId têm checkpoint no
 * provider_session; retry nunca recria um side-effect com id salvo. O único
 * passo não-consultável (media_publish do IG / create do FB) ganha um guard de
 * FASE antes da chamada — retry ambíguo vira falha HONESTA com CTA de
 * verificação, nunca post duplicado.
 */
interface MetaSession {
  provider?: string
  phase?: 'ig_publishing' | 'fb_creating'
  containerId?: string | null
  publishedMediaId?: string
}

const IG_CAPTION_MAX = 2200
/** Container IN_PROGRESS: repoll curto (processamento leva segundos–minutos). */
const POLL_MS = 60_000
/** Limite móvel de 100 posts/24h e rate de chamadas: adia 1h (reativo). */
const RATE_DEFER_MS = 60 * 60_000
/** Só publica adiantado dentro desta folga (clock skew). */
const DUE_GRACE_MS = 60_000

const AMBIGUOUS_CTA =
  'A tentativa anterior pode ter publicado antes de cair. Confira no perfil: se o post saiu, use "Vincular post real"; se não saiu, reagende'

export interface MetaPublisherDeps {
  api: MetaApi
  network: 'instagram' | 'facebook'
  config: {
    /** TTL da URL presigned que a Meta baixa (a mídia sai do R2 privado). */
    presignTtlSeconds: number
  }
  now: () => Date
}

export class MetaPublisher implements SocialPublisher {
  readonly network: 'instagram' | 'facebook'

  constructor(private readonly deps: MetaPublisherDeps) {
    this.network = deps.network
  }

  supports(format: PublicationFormat): boolean {
    return this.network === 'instagram'
      ? format === 'ig_feed' || format === 'ig_reels'
      : format === 'fb_post'
  }

  async publish(input: PublishInput): Promise<PublishOutcome> {
    try {
      return await this.run(input)
    } catch (error) {
      if (error instanceof MetaApiError) {
        if (error.kind === 'rate') {
          return {
            kind: 'deferred',
            nextAttemptAt: new Date(this.deps.now().getTime() + RATE_DEFER_MS),
            reason: 'Limite de publicações da Meta atingido. A publicação foi adiada por 1 hora',
          }
        }
        if (error.kind === 'token') {
          return {
            kind: 'permanent',
            reason: 'A conta da Meta precisa ser reconectada em Conexões. Depois reagende',
          }
        }
        if (error.kind === 'permanent') return { kind: 'permanent', reason: error.message }
        return { kind: 'retryable', reason: error.message }
      }
      throw error
    }
  }

  private async run(input: PublishInput): Promise<PublishOutcome> {
    const session = input.session as MetaSession
    // Post JÁ no ar (retry pós-publish): só resolve a URL e encerra.
    if (session.publishedMediaId) return this.finishPublished(input, session.publishedMediaId)
    return this.network === 'instagram' ? this.runInstagram(input) : this.runFacebook(input)
  }

  // ── Instagram: container → poll → (hora certa) → media_publish ─────────────

  private async runInstagram(input: PublishInput): Promise<PublishOutcome> {
    const session = input.session as MetaSession
    const caption = input.publication.caption
    if (caption.length > IG_CAPTION_MAX) {
      return {
        kind: 'permanent',
        reason: 'Legenda acima do limite do Instagram (2200 caracteres). Encurte no composer',
      }
    }
    const isReels = input.publication.format === 'ig_reels'
    const media = isReels ? pickVideo(input.assets) : pickImage(input.assets)
    if (!media?.r2Key) {
      return {
        kind: 'permanent',
        reason: isReels
          ? 'Nenhum vídeo pronto no conteúdo. Anexe o arquivo final na aba Anexos'
          : 'Nenhuma imagem pronta no conteúdo. Anexe a arte final na aba Anexos',
      }
    }
    // Regras de mídia da Graph API — falhar ANTES de gastar side-effect.
    if (!isReels && media.contentType !== 'image/jpeg') {
      return {
        kind: 'permanent',
        reason:
          'O feed do Instagram só aceita JPEG. Exporte a imagem em JPG, anexe de novo e reagende',
      }
    }
    if (isReels && media.contentType !== 'video/mp4' && media.contentType !== 'video/quicktime') {
      return {
        kind: 'permanent',
        reason: 'O Reels aceita vídeo MP4 (ou MOV). Converta o arquivo e anexe de novo',
      }
    }

    let containerId = session.containerId ?? null
    if (!containerId) {
      const mediaUrl = await input.assetUrl(media, this.deps.config.presignTtlSeconds)
      containerId = await this.deps.api.createIgContainer({
        accessToken: input.accessToken,
        igUserId: input.account.externalId,
        params: isReels
          ? { media_type: 'REELS', video_url: mediaUrl, caption }
          : { image_url: mediaUrl, caption },
      })
      // Checkpoint IMEDIATO: retry consulta o status, nunca cria 2º container.
      await input.saveSession({ provider: 'meta', containerId })
    }

    const status = await this.deps.api.getIgContainerStatus({
      accessToken: input.accessToken,
      containerId,
    })
    const now = this.deps.now()
    switch (status) {
      case 'IN_PROGRESS':
        // Processando no provedor: repoll SEM gastar tentativa.
        return { kind: 'pending', repollAt: new Date(now.getTime() + POLL_MS) }
      case 'ERROR':
        return {
          kind: 'permanent',
          reason:
            'O Instagram recusou a mídia (container com erro). Confira o arquivo e recrie a publicação',
        }
      case 'EXPIRED':
        // Container morreu SEM post (vale 24h) — limpar e refazer é seguro.
        await input.saveSession({ containerId: null })
        return { kind: 'retryable', reason: 'O container do Instagram expirou. Refazendo' }
      case 'PUBLISHED':
        // media_publish passou mas o crash engoliu o media id (guard de fase).
        return { kind: 'permanent', reason: AMBIGUOUS_CTA }
      case 'FINISHED':
        break
    }

    // Pronto ANTES da hora (lead): segura o publish até o horário agendado.
    const scheduledAt = input.publication.scheduledAt
    if (scheduledAt && scheduledAt.getTime() > now.getTime() + DUE_GRACE_MS) {
      return { kind: 'pending', repollAt: scheduledAt }
    }

    // Guard de fase ANTES do publish (o único passo IG não-consultável).
    await input.saveSession({ phase: 'ig_publishing' })
    const mediaId = await this.deps.api.publishIgContainer({
      accessToken: input.accessToken,
      igUserId: input.account.externalId,
      creationId: containerId,
    })
    await input.saveSession({ publishedMediaId: mediaId, phase: undefined })
    return this.finishPublished(input, mediaId)
  }

  // ── Facebook: post direto na hora certa (photos / videos por file_url) ─────

  private async runFacebook(input: PublishInput): Promise<PublishOutcome> {
    const session = input.session as MetaSession
    const media = pickFbMedia(input.assets)
    if (!media?.r2Key) {
      return {
        kind: 'permanent',
        reason:
          'Nenhuma imagem ou vídeo pronto no conteúdo. Anexe a mídia final ou mude para o modo lembrete',
      }
    }
    const now = this.deps.now()
    const scheduledAt = input.publication.scheduledAt
    // Sem side-effect antes da hora: FB posta NA hora (nada de rascunho remoto).
    if (scheduledAt && scheduledAt.getTime() > now.getTime() + DUE_GRACE_MS) {
      return { kind: 'pending', repollAt: scheduledAt }
    }
    // Retry pós-crash entre o create e o checkpoint: AMBÍGUO — nunca re-postar.
    if (session.phase === 'fb_creating') {
      return { kind: 'permanent', reason: AMBIGUOUS_CTA }
    }
    await input.saveSession({ provider: 'meta', phase: 'fb_creating' })
    const mediaUrl = await input.assetUrl(media, this.deps.config.presignTtlSeconds)
    const isVideo = media.contentType.startsWith('video/')
    const postId = isVideo
      ? await this.deps.api.createFbVideoPost({
          accessToken: input.accessToken,
          pageId: input.account.externalId,
          fileUrl: mediaUrl,
          description: input.publication.caption,
        })
      : await this.deps.api.createFbPhotoPost({
          accessToken: input.accessToken,
          pageId: input.account.externalId,
          imageUrl: mediaUrl,
          caption: input.publication.caption,
        })
    await input.saveSession({ publishedMediaId: postId, phase: undefined })
    return this.finishPublished(input, postId)
  }

  private async finishPublished(input: PublishInput, mediaId: string): Promise<PublishOutcome> {
    if (this.network === 'facebook') {
      return {
        kind: 'published',
        externalPostId: mediaId,
        externalUrl: `https://www.facebook.com/${mediaId}`,
      }
    }
    const permalink = await this.deps.api.getIgMediaPermalink({
      accessToken: input.accessToken,
      mediaId,
    })
    return { kind: 'published', externalPostId: mediaId, externalUrl: permalink }
  }
}

function pickImage(assets: MediaAsset[]): MediaAsset | null {
  const images = assets.filter(
    (a) => a.status === 'ready' && a.r2Key && a.contentType.startsWith('image/'),
  )
  return images.find((a) => a.kind === 'final') ?? images[0] ?? null
}

function pickVideo(assets: MediaAsset[]): MediaAsset | null {
  const videos = assets.filter(
    (a) => a.status === 'ready' && a.r2Key && a.contentType.startsWith('video/'),
  )
  return videos.find((a) => a.kind === 'final') ?? videos[0] ?? null
}

/** fb_post: a mídia FINAL vence (imagem ou vídeo); capa nunca ganha do final. */
function pickFbMedia(assets: MediaAsset[]): MediaAsset | null {
  const ready = assets.filter(
    (a) =>
      a.status === 'ready' &&
      a.r2Key &&
      (a.contentType.startsWith('image/') || a.contentType.startsWith('video/')),
  )
  return (
    ready.find((a) => a.kind === 'final' && a.contentType.startsWith('image/')) ??
    ready.find((a) => a.kind === 'final') ??
    ready[0] ??
    null
  )
}
