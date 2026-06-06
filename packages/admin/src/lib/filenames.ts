/**
 * Helpers PUROS de nome de arquivo (sem `server-only` — unit-testáveis via bun
 * test). Consumidos pela camada de mídia (`server/media.ts`).
 */

/** Extensão segura derivada do nome original (fallback `bin`). */
export function safeExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
}

/** Nome ASCII-seguro p/ o Content-Disposition (PG do header HTTP). */
export function sanitizeFilename(filename: string): string {
  return (
    filename
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // remove diacríticos combinantes (ã → a)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 120) || 'arquivo'
  )
}
