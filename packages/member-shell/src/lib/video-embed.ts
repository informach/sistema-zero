/**
 * O vídeo de um material complementar é uma URL que a autora cola. Aqui a gente decide se ela
 * vira um player EMBUTIDO ou um link que abre em outra aba.
 *
 * ⚠️⚠️ **A régua é uma ALLOWLIST de host, comparada por igualdade.** `url.includes('vimeo.com')`
 * casaria `vimeo.com.rastreador.net`, e o que está em jogo é abrir um iframe de terceiro numa
 * página de criança. Só entram os dois hosts que a CSP dos dois apps já libera em `frame-src`:
 * `player.vimeo.com` (o provedor dos vídeos da plataforma) e `www.youtube-nocookie.com` (a
 * variante do YouTube que não grava cookie antes do play). Qualquer outra coisa — Drive, Loom,
 * TikTok, um .mp4 solto — NÃO é embutida: o iframe seria bloqueado pela CSP em silêncio, e um
 * retângulo branco é pior que um link honesto.
 *
 * Nada aqui muda a CSP. Se um provedor novo fizer falta, ele precisa entrar no `frame-src` dos
 * dois apps ANTES de entrar nesta lista, e isso é decisão de produto, não de componente.
 */
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

const VIMEO_ID = /^\d+$/
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/

/**
 * A URL de embutir, ou `null` quando o vídeo deve virar link.
 * ⚠️ Nunca devolve a URL de entrada: o que vai ao `src` do iframe é sempre uma URL que ESTA
 * função montou, a partir de um id validado. É o que impede um `javascript:` ou um
 * `https://player.vimeo.com@outro-host/` de atravessar.
 */
export function videoEmbedUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)

  if (VIMEO_HOSTS.has(host)) {
    // vimeo.com/123 · vimeo.com/123/hash · player.vimeo.com/video/123?h=hash
    const [primeiro, segundo, terceiro] = parts
    const id = primeiro === 'video' ? segundo : primeiro
    const hash = primeiro === 'video' ? (url.searchParams.get('h') ?? terceiro) : segundo
    if (!id || !VIMEO_ID.test(id)) return null
    const embed = `https://player.vimeo.com/video/${id}`
    return hash && /^[A-Za-z0-9]+$/.test(hash) ? `${embed}?h=${hash}` : embed
  }

  if (YOUTUBE_HOSTS.has(host)) {
    // youtu.be/ID · youtube.com/watch?v=ID · youtube.com/embed/ID · youtube.com/shorts/ID
    const id = host.endsWith('youtu.be')
      ? parts[0]
      : parts[0] === 'embed' || parts[0] === 'shorts'
        ? parts[1]
        : (url.searchParams.get('v') ?? undefined)
    if (!id || !YOUTUBE_ID.test(id)) return null
    return `https://www.youtube-nocookie.com/embed/${id}`
  }

  return null
}
