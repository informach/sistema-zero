/** Teto da miniatura (data URL JPEG ~320×192 fica bem abaixo disso). */
export const MAX_PROJECT_THUMB_CHARS = 300_000
export function thumbDataUrlOf(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const dataUrl = (value as { dataUrl?: unknown }).dataUrl
  if (typeof dataUrl !== 'string') return undefined
  if (!dataUrl.startsWith('data:image/') || dataUrl.length > MAX_PROJECT_THUMB_CHARS)
    return undefined
  return dataUrl
}
