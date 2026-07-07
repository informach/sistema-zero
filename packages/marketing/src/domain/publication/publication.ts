/**
 * Tipos e regras PURAS das publicações (uma por rede/formato de um conteúdo).
 */
export type ContentType = 'reels' | 'video_long' | 'carousel' | 'static_post' | 'story'

export type Network = 'instagram' | 'facebook' | 'youtube' | 'tiktok'

export type PublicationFormat =
  | 'ig_feed'
  | 'ig_carousel'
  | 'ig_reels'
  | 'ig_story'
  | 'fb_post'
  | 'fb_reels'
  | 'yt_video'
  | 'yt_short'
  | 'tt_video'

export type PublishMode = 'auto' | 'manual'

export type PublicationStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'publishing'
  | 'awaiting_manual'
  | 'published'
  | 'failed'
  | 'canceled'

/** Rede dona de cada formato (denormalizada na linha p/ o índice de claim). */
export const FORMAT_NETWORK: Record<PublicationFormat, Network> = {
  ig_feed: 'instagram',
  ig_carousel: 'instagram',
  ig_reels: 'instagram',
  ig_story: 'instagram',
  fb_post: 'facebook',
  fb_reels: 'facebook',
  yt_video: 'youtube',
  yt_short: 'youtube',
  tt_video: 'tiktok',
}

/** Rótulos PT dos formatos (mensagens do backend — lembrete/erros). */
export const FORMAT_LABELS: Record<PublicationFormat, string> = {
  ig_feed: 'Post no Instagram',
  ig_carousel: 'Carrossel no Instagram',
  ig_reels: 'Reels no Instagram',
  ig_story: 'Story no Instagram',
  fb_post: 'Post no Facebook',
  fb_reels: 'Reels no Facebook',
  yt_video: 'Vídeo no YouTube',
  yt_short: 'Short no YouTube',
  tt_video: 'Vídeo no TikTok',
}

/**
 * Stories não têm API de publicação (em NENHUMA ferramenta) — o formato é
 * SEMPRE `manual` (lembrete na hora + marcar como publicado).
 */
export function forcesManualMode(format: PublicationFormat): boolean {
  return format === 'ig_story'
}

/** Estados em que os campos (legenda/capa/horário/título) ainda podem ser editados. */
const EDITABLE_STATUSES: ReadonlySet<PublicationStatus> = new Set([
  'draft',
  'ready',
  'scheduled',
  'awaiting_manual',
  'failed',
])

export function isEditable(status: PublicationStatus): boolean {
  return EDITABLE_STATUSES.has(status)
}

/** Estados de onde se pode (re)agendar. */
export function canSchedule(status: PublicationStatus): boolean {
  return EDITABLE_STATUSES.has(status)
}

/** Estados de onde se pode cancelar (publishing é do worker; published é imutável). */
export function canCancelPublication(status: PublicationStatus): boolean {
  return EDITABLE_STATUSES.has(status)
}

/** Estados de onde o modo lembrete pode marcar como publicada. */
export function canMarkPublished(status: PublicationStatus): boolean {
  return (
    status === 'draft' ||
    status === 'ready' ||
    status === 'scheduled' ||
    status === 'awaiting_manual' ||
    status === 'failed'
  )
}

/** A publicação conta como "ativa" p/ derivar a etapa do conteúdo? */
export function isActivePublication(status: PublicationStatus): boolean {
  return status !== 'canceled'
}

/** A publicação está pendente de sair (agenda em andamento)? */
export function isPendingPublication(status: PublicationStatus): boolean {
  return (
    status === 'scheduled' ||
    status === 'publishing' ||
    status === 'awaiting_manual' ||
    status === 'failed'
  )
}
