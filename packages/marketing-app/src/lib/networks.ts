/**
 * Limites e rótulos por rede/formato p/ o composer de publicações. PURO
 * (unit-testado) — espelha o vocabulário de formatos do @sistemazero/marketing
 * (`domain/publication/publication.ts`); mudou lá, mude aqui.
 */

export const PUBLICATION_FORMATS = [
  'ig_feed',
  'ig_carousel',
  'ig_reels',
  'ig_story',
  'fb_post',
  'fb_reels',
  'yt_video',
  'yt_short',
  'tt_video',
] as const

export type PublicationFormat = (typeof PUBLICATION_FORMATS)[number]

export const SOCIAL_NETWORKS = ['instagram', 'facebook', 'youtube', 'tiktok'] as const
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]

/** Rede é DERIVADA do formato (mesma denormalização do backend). */
export const FORMAT_NETWORK: Record<PublicationFormat, SocialNetwork> = {
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

/**
 * Limites publicados pelas redes (contagem simples de caracteres — as redes
 * contam grafemas de formas diferentes, então o composer avisa, não trava).
 * No YouTube a "legenda" do composer vira a DESCRIÇÃO e o título tem limite
 * próprio (100). Números confirmados na API oficial do YouTube: `description`
 * é em BYTES (não caracteres — acentos contam 2, emoji até 4) e `tags` é o
 * TOTAL de caracteres somando todas as tags, incluindo as vírgulas separadoras.
 */
export const NETWORK_LIMITS = {
  instagram: { caption: 2200, hashtags: 30 },
  tiktok: { caption: 2200 },
  youtube: { title: 100, description: 5000, tags: 500 },
  facebook: { caption: 63206 },
} as const

/** Teto de caracteres da legenda p/ o formato (YouTube usa a descrição). */
export function captionLimitFor(format: PublicationFormat): number {
  const network = FORMAT_NETWORK[format]
  return network === 'youtube'
    ? NETWORK_LIMITS.youtube.description
    : NETWORK_LIMITS[network].caption
}

/** Teto de hashtags do formato, ou null quando a rede não impõe limite. */
export function hashtagLimitFor(format: PublicationFormat): number | null {
  return FORMAT_NETWORK[format] === 'instagram' ? NETWORK_LIMITS.instagram.hashtags : null
}

// `\p{L}\p{N}_` cobre hashtags com acento/emoji-free (padrão das redes); um `#`
// solto (sem palavra) não conta.
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu

/** Quantidade de hashtags na legenda. */
export function countHashtags(caption: string): number {
  return caption.match(HASHTAG_RE)?.length ?? 0
}

const UTF8 = new TextEncoder()

/** Tamanho da string em BYTES UTF-8 (o YouTube conta a descrição em bytes). */
export function byteLength(s: string): number {
  return UTF8.encode(s).length
}

/**
 * A legenda estoura o limite da descrição do YouTube (5000 BYTES)? Nas demais
 * redes o limite é em caracteres — aqui é sempre false.
 */
export function isDescriptionOverLimit(format: PublicationFormat, caption: string): boolean {
  if (FORMAT_NETWORK[format] !== 'youtube') return false
  return byteLength(caption) > NETWORK_LIMITS.youtube.description
}

/** O YouTube recusa títulos com `<` ou `>`. */
export function titleHasForbiddenChars(title: string): boolean {
  return title.includes('<') || title.includes('>')
}

/** A legenda estoura algum limite do formato (bytes no YouTube, caracteres nas demais, hashtags)? */
export function isOverLimit(format: PublicationFormat, caption: string): boolean {
  if (FORMAT_NETWORK[format] === 'youtube') {
    if (isDescriptionOverLimit(format, caption)) return true
  } else if (caption.length > captionLimitFor(format)) {
    return true
  }
  const hashtagLimit = hashtagLimitFor(format)
  return hashtagLimit !== null && countHashtags(caption) > hashtagLimit
}

/** Rótulos PT por formato (chips do composer/kanban). */
export const FORMAT_LABELS: Record<PublicationFormat, string> = {
  ig_feed: 'Post no feed',
  ig_carousel: 'Carrossel',
  ig_reels: 'Reels',
  ig_story: 'Story',
  fb_post: 'Post no Facebook',
  fb_reels: 'Reels no Facebook',
  yt_video: 'Vídeo longo',
  yt_short: 'Short',
  tt_video: 'TikTok',
}

/** Rótulos PT por rede. */
export const NETWORK_LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}
