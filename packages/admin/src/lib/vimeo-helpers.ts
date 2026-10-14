/**
 * Helpers PUROS da integração Vimeo (sem `server-only` — unit-testáveis e
 * importáveis também por Client Component, ex.: `vimeo-preview.tsx`).
 */

/** Normaliza o CSV de domínios autorizados a embedar (privacy whitelist). */
export function parseWhitelistDomains(raw: string): string[] {
  return raw
    .split(',')
    .map((domain) =>
      domain
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, ''),
    )
    .filter(Boolean)
}

/** Prioriza caption PT > qualquer PT > ativo > primeiro (régua da referência). */
export function pickTranscriptTrack<T extends { language: string; type: string; active: boolean }>(
  tracks: T[],
): T | null {
  if (tracks.length === 0) return null
  const isPt = (lang: string) => lang.toLowerCase().startsWith('pt')
  return (
    tracks.find((t) => t.type === 'captions' && isPt(t.language)) ??
    tracks.find((t) => isPt(t.language)) ??
    tracks.find((t) => t.active) ??
    tracks[0] ??
    null
  )
}

/**
 * URL de embed SEGURA p/ iframe: só `https:` (um bloco legado/adulterado com
 * `javascript:`/`data:` executaria no contexto do painel). `null` = não renderizar.
 */
export function parseSafeEmbedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export type VimeoProcessingStatus = 'processing' | 'ready' | 'failed'

/**
 * Status cru do Vimeo → estado da aplicação (vídeos das aulas e gravações dos encontros).
 * ⚠️ No envio por `pull` (gravação de encontro) o Vimeo pode falhar ao BAIXAR o arquivo
 * (`uploading_error`): sem esse caso a gravação ficaria "processando" para sempre.
 */
export function mapVimeoStatus(status: string): VimeoProcessingStatus {
  if (status === 'available') return 'ready'
  if (
    [
      'transcoding_error',
      'uploading_error',
      'quota_exceeded',
      'total_cap_exceeded',
      'unavailable',
    ].includes(status)
  )
    return 'failed'
  return 'processing'
}
