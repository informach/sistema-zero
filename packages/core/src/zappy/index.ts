/** Texto cru máximo aceito por uma fonte do RAG (bytes UTF-8, não chars). */
export const ZAPPY_SOURCE_CONTENT_MAX_BYTES = 480 * 1024

/**
 * Corpo JSON do transporte. Fica no teto global do gateway porque aspas,
 * barras e controles podem expandir bastante ao serializar os 480 KiB de texto.
 * O serviço continua impondo o limite menor ao conteúdo já decodificado.
 */
export const ZAPPY_SOURCE_REQUEST_MAX_BYTES = 2 * 1024 * 1024

/** Máximo aceito pelo caso de uso por página; reduz round-trips do backfill administrativo. */
export const ZAPPY_KNOWLEDGE_BACKFILL_BATCH_SIZE = 25

/** Contrato compartilhado entre o orquestrador Admin e o gateway. */
export const ZAPPY_KNOWLEDGE_BACKFILL_RATE_LIMIT_PER_MINUTE = 60

/** Reserva uma chamada da janela para tolerar jitter do relógio/rede. */
export const ZAPPY_KNOWLEDGE_BACKFILL_MIN_INTERVAL_MS = Math.ceil(
  60_000 / (ZAPPY_KNOWLEDGE_BACKFILL_RATE_LIMIT_PER_MINUTE - 1),
)

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
