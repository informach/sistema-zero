/** Texto cru máximo aceito por uma fonte do RAG (bytes UTF-8, não chars). */
export const ZAPPY_SOURCE_CONTENT_MAX_BYTES = 480 * 1024

/**
 * Corpo JSON do transporte. Fica no teto global do gateway porque aspas,
 * barras e controles podem expandir bastante ao serializar os 480 KiB de texto.
 * O serviço continua impondo o limite menor ao conteúdo já decodificado.
 */
export const ZAPPY_SOURCE_REQUEST_MAX_BYTES = 2 * 1024 * 1024

export function zappySourceContentBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function zappyVimeoVideoId(provider: string, source: string): string | null {
  if (provider !== 'vimeo') return null
  const trimmed = source.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || (host !== 'vimeo.com' && !host.endsWith('.vimeo.com'))) {
      return null
    }
    return (
      url.pathname.match(/(?:^|\/)video\/(\d+)(?:\/|$)/)?.[1] ??
      url.pathname.match(/(?:^|\/)(\d+)(?:\/|$)/)?.[1] ??
      null
    )
  } catch {
    return null
  }
}
