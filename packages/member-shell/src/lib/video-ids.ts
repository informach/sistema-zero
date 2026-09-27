/**
 * Ids de vídeo a partir da URL que a autora colou. O `src` cru NUNCA vai para um iframe:
 * quem monta a URL de embed é o player, a partir do id validado aqui.
 */

export function youtubeId(src: string): string | null {
  const m = src.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  )
  return m?.[1] ?? null
}

/**
 * Extrai o ID numérico do Vimeo e, quando presente, o HASH de privacidade (`h`)
 * dos vídeos NÃO LISTADOS — forma de caminho (`vimeo.com/<id>/<hash>`) ou de query
 * (`?h=<hash>`). Sem o hash, o SDK não consegue tocar um vídeo unlisted. Tanto o id
 * (dígitos) quanto o hash (alfanumérico) são validados pela regex — nunca o src cru.
 */
export function parseVimeo(src: string): { id: string; hash: string | null } | null {
  const m = src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})(?:\/([A-Za-z0-9]{4,40}))?/)
  const id = m?.[1]
  if (!id) return null
  const queryHash = src.match(/[?&]h=([A-Za-z0-9]{4,40})/)?.[1] ?? null
  return { id, hash: m[2] ?? queryHash }
}
